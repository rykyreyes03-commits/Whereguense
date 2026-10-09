// Prueba del menú de Configuración (turista y emprendedor), el selector de idioma real y la tarjeta "Ver mi perfil" del Resumen.
// Uso (desde la raíz del proyecto):  node docs/tests/sitio_front/menu.test.mjs   (requiere playwright; CHROMIUM_PATH opcional)
import { createServer } from 'vite';
import { chromium } from 'playwright';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const servidor = await createServer({ configFile: path.join(aqui, 'vite.config.mjs') });
await servidor.listen();
const base = 'http://localhost:5198/';
const capturas = process.env.CAPTURAS || path.join(os.homedir(), 'Downloads');
let total = 0;
const fallas = [];
const ok = (cond, texto) => { total += 1; if (!cond) fallas.push(texto); console.log(`${cond ? 'OK   ' : 'FALLA'} ${texto}`); };
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});

async function abrir(query, esperar, ancho = 390) {
  const ctx = await browser.newContext({ viewport: { width: ancho, height: 800 }, locale: 'en-US' });
  const page = await ctx.newPage();
  const errores = [];
  const dialogos = [];
  page.on('pageerror', (e) => errores.push(e.message));
  page.on('dialog', (d) => { dialogos.push(d.message()); d.dismiss(); });
  await page.addInitScript(() => { window.__db = { uid: 'yo', sesion: true, llamadas: [], fotos: [], resenas: [] }; });
  await page.goto(`${base}?${query}&lang=es`);
  await page.waitForSelector(esperar);
  await page.waitForTimeout(300);
  return { ctx, page, errores, dialogos };
}
const etiquetas = (page) => page.locator('.menu-item-texto').allTextContents();

// ---- Menú del turista: igual que siempre
{
  const { ctx, page } = await abrir('vista=menu', '.menu-lista');
  const e = await etiquetas(page);
  ok(e.join(' | ') === 'Escanear sello QR | Escanear cupón | Mis cupones | Mi negocio | Cambiar idioma | Notificaciones | Tema | Privacidad | Ayuda y soporte | Acerca de', `turista: ${e.join(' | ')}`);
  await page.click('.menu-item:has-text("Mis cupones")');
  ok((await page.evaluate(() => window.__eventos.map((x) => x[1]).join(','))) === 'misCupones', 'turista: "Mis cupones" (ya no está en el pasaporte) abre la pantalla de cupones');
  await ctx.close();
}
{
  const { ctx, page } = await abrir('vista=menu&admin=1', '.menu-lista');
  ok((await etiquetas(page))[0] === 'Panel Admin', 'turista admin: "Panel Admin" va primero');
  await ctx.close();
}

// ---- Menú del emprendedor
for (const ancho of [360, 412]) {
  const t = `[${ancho}px]`;
  const { ctx, page, errores, dialogos } = await abrir('vista=menu&negocio=1', '.menu-lista', ancho);
  const e = await etiquetas(page);
  ok(e.join(' | ') === 'Cambiar idioma | Notificaciones | Tema | Privacidad | Ayuda y soporte | Acerca de', `${t} emprendedor: ${e.join(' | ')}`);
  ok(!e.includes('Escanear sello QR') && !e.includes('Escanear cupón') && !e.includes('Mis cupones'), `${t} emprendedor: sin escanear sello ni cupón ni Mis cupones`);
  ok(!e.includes('Mi negocio'), `${t} emprendedor: sin "Mi negocio"`);
  ok(!e.includes('Panel Admin'), `${t} emprendedor que no es admin: sin "Panel Admin"`);
  ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), `${t} sin desborde horizontal`);

  // Cambiar idioma: abre un selector real (no el aviso "próximamente")
  await page.click('.menu-item:has-text("Cambiar idioma")');
  ok(dialogos.length === 0, `${t} Cambiar idioma no lanza el aviso "próximamente"`);
  ok((await page.locator('.menu-selector-opcion').allTextContents()).join(',') === 'Español,English', `${t} el selector ofrece Español y English`);
  ok((await page.locator('.menu-selector-opcion[aria-checked="true"]').textContent()) === 'Español', `${t} está marcado el idioma actual (Español)`);
  const alto = await page.locator('.menu-selector-opcion').first().boundingBox();
  ok(alto.height >= 44, `${t} los botones de idioma miden al menos 44 px (${Math.round(alto.height)})`);
  await page.screenshot({ path: path.join(capturas, `menu_emprendedor_${ancho}.png`) });
  await page.click('.menu-selector-opcion:has-text("English")');
  await page.waitForTimeout(200);
  const en = await etiquetas(page);
  ok(en.join(' | ') === 'Change language | Notifications | Theme | Privacy | Help and support | About', `${t} la pantalla pasa a inglés: ${en.join(' | ')}`);
  ok((await page.locator('.topbar-titulo').textContent()) === 'Settings', `${t} el título pasa a "Settings"`);
  ok((await page.evaluate(() => localStorage.getItem('idioma'))) === 'en', `${t} el idioma queda guardado`);
  ok((await page.locator('.menu-selector-opcion[aria-checked="true"]').textContent()) === 'English', `${t} ahora está marcado English`);
  await page.click('.menu-item:has-text("Notifications")');
  ok(dialogos.length === 1 && dialogos[0] === 'Notifications: coming soon 🚧', `${t} las demás opciones siguen con su aviso, ya en inglés (${dialogos[0]})`);
  await page.click('.menu-selector-opcion:has-text("Español")');
  await page.waitForTimeout(200);
  ok((await etiquetas(page))[0] === 'Cambiar idioma', `${t} se puede volver al español`);
  ok(errores.length === 0, `${t} sin errores de página (${errores.join('; ')})`);
  await ctx.close();
}
{
  const { ctx, page } = await abrir('vista=menu&negocio=1&admin=1', '.menu-lista');
  const e = await etiquetas(page);
  ok(e[0] === 'Panel Admin' && e.length === 7, 'emprendedor que SÍ es admin: "Panel Admin" aparece (solo para admins)');
  await ctx.close();
}

// ---- Panel del emprendedor: sin tarjeta "Ver mi perfil"; botón de perfil en la cabecera
for (const ancho of [360, 412]) {
  const t = `[${ancho}px]`;
  const { ctx, page, errores } = await abrir('vista=negocio', '.perfilnegocio-accesos', ancho);
  const tarjetas = await page.locator('.perfilnegocio-acceso strong').allTextContents();
  ok(!tarjetas.includes('Ver mi perfil') && tarjetas.length === 3, `${t} el Resumen vuelve a tener solo sus 3 tarjetas (${tarjetas.join(' | ')})`);
  const boton = page.locator('.topbar-perfil-btn');
  ok((await boton.count()) === 1, `${t} hay un solo botón de perfil en la cabecera`);
  ok((await boton.getAttribute('aria-label')) === 'Perfil', `${t} el botón se llama "Perfil"`);
  ok((await boton.locator('svg').count()) === 1 && (await boton.locator('img').count()) === 0, `${t} lleva el ícono User (un svg, sin imágenes sueltas)`);
  const caja = await boton.boundingBox();
  ok(caja.width >= 44 && caja.height >= 44, `${t} mide al menos 44 px (${Math.round(caja.width)}x${Math.round(caja.height)})`);
  ok(caja.x + caja.width > ancho - 40 && caja.y < 120, `${t} está arriba a la derecha (x ${Math.round(caja.x)}, y ${Math.round(caja.y)})`);
  const menu = await page.locator('.topbar-menu').boundingBox();
  ok(menu.x < 60, `${t} el menú sigue arriba a la izquierda`);
  await page.screenshot({ path: path.join(capturas, `emprendedor_cabecera_${ancho}.png`) });
  await boton.click();
  ok((await page.evaluate(() => window.__eventos.map((x) => x[1]).join(','))) === 'perfil', `${t} el botón abre 'perfil'`);
  ok(errores.length === 0, `${t} sin errores de página (${errores.join('; ')})`);
  await ctx.close();
}

// ---- Perfil abierto desde el panel del emprendedor: foto, datos, idioma y cerrar sesión
for (const ancho of [360, 412]) {
  const t = `[${ancho}px perfil emprendedor]`;
  const { ctx, page, errores } = await abrir('vista=perfil&negocio=1', '.perfil-wrapper', ancho);
  const texto = await page.evaluate(() => document.body.innerText);
  ok(texto.includes('Datos de usuario') && texto.includes('Idioma preferido') && texto.includes('Cerrar sesión'), `${t} muestra datos, idioma y cerrar sesión`);
  ok((await page.locator('.perfil-avatar').count()) === 1 && texto.includes('Subir foto'), `${t} muestra la foto y su botón`);
  ok((await page.locator('.perfil-sellos-resumen').count()) === 0 && !texto.includes('Ver mis sellos') && !texto.includes('Ranking'), `${t} sin sellos ni ranking (son del turista)`);
  ok((await page.locator('.perfil-rango').count()) === 0 && (await page.locator('.perfil-danzante').count()) === 0, `${t} sin el rango de turista ni "Danzante"`);
  ok((await page.locator('.topbar-volver').count()) === 1, `${t} tiene ← Volver`);
  await page.screenshot({ path: path.join(capturas, `perfil_emprendedor_${ancho}.png`) });
  ok(errores.length === 0, `${t} sin errores de página (${errores.join('; ')})`);
  await ctx.close();
}
{
  const { ctx, page } = await abrir('vista=perfil', '.perfil-wrapper');
  const texto = await page.evaluate(() => document.body.innerText);
  ok((await page.locator('.perfil-sellos-resumen').count()) === 1 && texto.includes('Ver mis sellos') && texto.includes('Ranking') && texto.includes('Danzante'), 'el Perfil del turista conserva sellos, ranking y danzante');
  await ctx.close();
}

await browser.close();
await servidor.close();
console.log(`\n${total - fallas.length}/${total} comprobaciones`);
if (fallas.length) { console.log('FALLAS:\n' + fallas.join('\n')); process.exit(1); }
