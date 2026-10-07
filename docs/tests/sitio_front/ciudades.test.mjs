// Pruebas del pasaporte por ciudades: las 7 tarjetas, los contadores, León con sus pestañas y las demás ciudades con su aviso.
// Uso (desde la raíz del proyecto):  node docs/tests/sitio_front/ciudades.test.mjs   (requiere playwright; CHROMIUM_PATH opcional)
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

const BD = {
  uid: 'yo', sesion: true, llamadas: [], fotos: [], resenas: [],
  nivel: { nivel_actual: 3, puntos_actuales: 0.5, puntos_para_siguiente: 6, porcentaje: 8, puntos_totales: 6.5 },
  sitioFila: [{ id: 1, rango: 'oro', ciudad: 'León' }, { id: 6, rango: 'plata', ciudad: 'León' }, { id: 12, rango: 'cobre', ciudad: 'León' }],
};
async function abrir(query, esperar, ancho = 390) {
  const ctx = await browser.newContext({ viewport: { width: ancho, height: 800 }, locale: 'en-US' });
  const page = await ctx.newPage();
  const errores = [];
  page.on('pageerror', (e) => errores.push(e.message));
  await page.addInitScript((bd) => { window.__db = bd; }, BD);
  // las comprobaciones están en inglés salvo que la consulta pida otro idioma
  await page.goto(`${base}?${query}${query.includes('lang=') ? '' : '&lang=en'}`);
  await page.waitForSelector(esperar);
  await page.waitForTimeout(400);
  return { ctx, page, errores };
}
const eventos = (page) => page.evaluate(() => window.__eventos.map((e) => e.join(':')).join(','));
const NOMBRES = ['León', 'Managua', 'Granada', 'Masaya', 'Matagalpa', 'Estelí', 'Chinandega'];

for (const ancho of [360, 412]) {
  const t = `[${ancho}px]`;
  const { ctx, page, errores } = await abrir('vista=pasaporte', '.ciudad-card', ancho);

  // ---- las tarjetas
  ok((await page.locator('.ciudad-card').count()) === 7, `${t} hay 7 tarjetas de ciudad`);
  ok((await page.locator('.ciudad-card-nombre').allTextContents()).join(',') === NOMBRES.join(','), `${t} en este orden: ${NOMBRES.join(', ')}`);
  const imagenes = await page.locator('.ciudad-card-imagen').evaluateAll((els) => els.map((e) => e.complete && e.naturalWidth > 0));
  ok(imagenes.length === 7 && imagenes.every(Boolean), `${t} las 7 imágenes cargan`);
  ok((await page.locator('.ciudad-card').nth(0).locator('.ciudad-card-contador').textContent()) === '3 of 89 stamps', `${t} León: "3 of 89 stamps" (los 3 sellos de sitio; el de QR de negocio no cuenta)`);
  const pronto = await page.locator('.ciudad-card--pronto .ciudad-card-contador').allTextContents();
  ok(pronto.length === 6 && pronto.every((x) => x === 'Coming soon'), `${t} las otras 6 dicen "Coming soon" (no "0 of 0")`);

  const cajas = await page.locator('.ciudad-card').evaluateAll((els) => els.map((e) => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return { w: r.width, h: r.height, top: r.top, bottom: r.bottom, radio: parseFloat(cs.borderTopLeftRadius), fondo: cs.backgroundImage, sombra: cs.boxShadow, nombre: getComputedStyle(e.querySelector('.ciudad-card-nombre')) }; }));
  const ancho0 = cajas[0].w;
  ok(cajas.every((c) => Math.abs(c.h - 160) < 1), `${t} cada tarjeta mide 160 px de alto`);
  ok(cajas.every((c) => Math.abs(c.w - ancho0) < 1) && ancho0 > ancho - 60 && ancho0 < ancho, `${t} ancho completo menos el relleno (${Math.round(ancho0)} de ${ancho})`);
  ok(cajas.every((c, i) => i === 0 || Math.abs(c.top - cajas[i - 1].bottom - 14) < 1), `${t} 14 px de separación entre tarjetas, en columna`);
  ok(cajas.every((c) => c.radio >= 16 && c.sombra !== 'none'), `${t} bordes redondeados y sombra suave`);
  ok(cajas[0].fondo.includes('rgb(27, 42, 107)') && cajas[0].fondo.includes('gradient'), `${t} fondo azul marino #1B2A6B con degradado`);
  ok(cajas.every((c) => c.nombre.color === 'rgb(255, 255, 255)' && Number(c.nombre.fontWeight) >= 700), `${t} el nombre va en blanco y en negrita`);
  ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), `${t} sin desborde horizontal`);
  ok((await page.locator('.nivel-progreso').count()) === 1 && (await page.locator('.mis-sellos-cupones').count()) === 1, `${t} se mantienen el nivel y "Mis cupones" arriba`);
  ok((await page.locator('.bottom-nav').count()) === 1, `${t} se mantiene la barra inferior`);
  await page.screenshot({ path: path.join(capturas, `pasaporte_ciudades_${ancho}.png`) });

  // ---- otras ciudades: aviso "Próximamente"
  for (const nombre of NOMBRES.slice(1)) {
    await page.click(`.ciudad-card:has-text("${nombre}")`);
    const dialogo = page.locator('[role="dialog"]');
    ok((await dialogo.count()) === 1, `${t} ${nombre}: se abre el aviso`);
    const texto = await dialogo.innerText();
    ok(texto.includes('Coming soon to WhereGüense') && texto.includes(`We're getting the sites of ${nombre} ready.`) && texto.includes('Complete your León passport first.'), `${t} ${nombre}: el texto nombra la ciudad y manda a completar León`);
    await page.click('[role="dialog"] button');
    ok((await dialogo.count()) === 0, `${t} ${nombre}: "Back" cierra el aviso`);
  }
  await page.click('.ciudad-card:has-text("Managua")');
  ok((await page.evaluate(() => document.activeElement.className)) === 'proximamente-boton', `${t} el foco entra al botón del aviso`);
  await page.screenshot({ path: path.join(capturas, `pasaporte_proximamente_${ancho}.png`) });
  await page.keyboard.press('Escape');
  ok((await page.locator('[role="dialog"]').count()) === 0, `${t} Escape cierra el aviso`);
  ok((await page.evaluate(() => document.activeElement.textContent)).includes('Managua'), `${t} el foco vuelve a la tarjeta de Managua`);
  await page.click('.ciudad-card:has-text("Granada")');
  await page.mouse.click(5, 5);
  ok((await page.locator('[role="dialog"]').count()) === 0, `${t} tocar fuera cierra el aviso`);
  ok((await page.locator('.sello-card').count()) === 0 && (await eventos(page)) === '', `${t} las otras ciudades no navegan ni muestran sellos`);

  // ---- León: todos / mis sellos
  await page.click('.ciudad-card:has-text("León")');
  await page.waitForSelector('.sello-card');
  ok((await page.locator('.topbar-titulo').textContent()) === 'León stamps', `${t} León: título de la pantalla`);
  ok((await page.locator('.sellos-ciudad-contador').textContent()) === '3 of 89 stamps', `${t} León: contador "3 of 89 stamps"`);
  const pestanas = await page.locator('[role="tab"]').allTextContents();
  ok(pestanas.length === 2 && pestanas[0].startsWith('All') && pestanas[0].includes('89') && pestanas[1].startsWith('My stamps') && pestanas[1].includes('3'), `${t} León: pestañas "All 89" y "My stamps 3" (${pestanas.join(' | ')})`);
  ok((await page.locator('[role="tab"][aria-selected="true"]').textContent()).startsWith('All'), `${t} León: empieza en "All"`);
  ok((await page.locator('.sello-card').count()) === 89, `${t} León: "All" muestra los 89 sitios`);
  ok((await page.locator('.sello-card.obtenido').count()) === 3 && (await page.locator('.sello-card.bloqueado').count()) === 86, `${t} León: 3 obtenidos y 86 sin sellar`);
  const tarjetaOro = page.locator('.sello-card', { hasText: 'Catedral de León' }).first();
  ok((await tarjetaOro.locator('img.sello-icono').count()) === 1 && (await tarjetaOro.locator('strong').textContent()) === 'Catedral de León', `${t} cada sello muestra su insignia y el nombre del sitio`);
  ok((await tarjetaOro.locator('.rango-sello-nombre').textContent()) === 'Gold' && (await tarjetaOro.locator('.sello-fecha').textContent()).startsWith('Collected on'), `${t} la Catedral: rango Gold y "Collected on …"`);
  const bloqueada = page.locator('.sello-card.bloqueado').first();
  ok((await bloqueada.locator('.sello-fecha').textContent()) === 'Not stamped' && (await bloqueada.locator('.rango-sello-nombre').count()) === 1, `${t} un sitio sin sellar dice "Not stamped" y muestra su rango`);
  ok((await page.locator('.sello-card .rango-sello').count()) === 89, `${t} los 89 sitios llevan su rango`);

  await page.click('[role="tab"]:has-text("My stamps")');
  ok((await page.locator('.sello-card').count()) === 3 && (await page.locator('.sello-card.bloqueado').count()) === 0, `${t} "My stamps" muestra solo los 3 obtenidos`);
  ok((await page.locator('[role="tab"][aria-selected="true"]').textContent()).startsWith('My stamps'), `${t} la pestaña activa cambia`);
  ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), `${t} León sin desborde horizontal`);
  await page.screenshot({ path: path.join(capturas, `pasaporte_leon_mios_${ancho}.png`) });
  await page.click('.sello-card.obtenido >> nth=0');
  ok((await eventos(page)).includes('sitio:1') && (await eventos(page)).includes('ir:detalleSello'), `${t} tocar un sello abre su detalle`);
  await page.click('[role="tab"]:has-text("All")');
  await page.screenshot({ path: path.join(capturas, `pasaporte_leon_todos_${ancho}.png`) });
  ok((await page.locator('.bottom-nav').count()) === 1, `${t} León: barra inferior`);
  await page.click('.topbar-volver');
  ok((await page.locator('.ciudad-card').count()) === 7, `${t} ← Back vuelve a las ciudades`);
  ok(errores.length === 0, `${t} sin errores de página (${errores.join('; ')})`);
  await ctx.close();
}

// ---- sin sellos: "Mis sellos" vacío
{
  const { ctx, page } = await abrir('vista=pasaporte&sinsellos=1', '.ciudad-card');
  ok((await page.locator('.ciudad-card').first().locator('.ciudad-card-contador').textContent()) === '0 of 89 stamps', 'sin sellos: León dice "0 of 89 stamps"');
  await page.click('.ciudad-card:has-text("León")');
  await page.click('[role="tab"]:has-text("My stamps")');
  const t = await page.evaluate(() => document.body.innerText);
  ok(t.includes('You have no León stamps yet') && t.includes('Visit a site on the map to get your first one.') && (await page.locator('.sello-card').count()) === 0, 'sin sellos: "My stamps" explica cómo conseguir el primero');
  await ctx.close();
}

// ---- llegando por el aviso de un sello nuevo: se abre León con ese sello resaltado
{
  const { ctx, page } = await abrir('vista=pasaporte&resaltado=1', '.sello-card');
  ok((await page.locator('.topbar-titulo').textContent()) === 'León stamps', 'con un sello recién obtenido se abre directo la ciudad del sitio');
  ok((await page.locator('.sello-card.recien-obtenido').count()) === 1 && (await page.locator('.sello-card.recien-obtenido strong').textContent()) === 'Catedral de León', 'y el sello nuevo queda resaltado');
  await ctx.close();
}

// ---- en español
{
  const { ctx, page } = await abrir('vista=pasaporte&lang=es', '.ciudad-card');
  await page.click('.ciudad-card:has-text("Estelí")');
  const texto = await page.locator('[role="dialog"]').innerText();
  ok(texto.includes('Próximamente en WhereGüense') && texto.includes('Estamos preparando los sitios de Estelí.') && texto.includes('Completa tu pasaporte de León primero.') && texto.includes('Volver'), 'es: el aviso dice exactamente lo pedido');
  await ctx.close();
}

await browser.close();
await servidor.close();
console.log(`\n${total - fallas.length}/${total} comprobaciones`);
if (fallas.length) { console.log('FALLAS:\n' + fallas.join('\n')); process.exit(1); }
