// Prueba de la ficha pública y del editor de diseño, con Supabase simulado, a 360, 412 y 1280 px.
// Uso (desde la raíz):  node docs/tests/diseno_front/prueba.mjs
// Requiere playwright (CHROMIUM_PATH=ruta/al/ejecutable si hace falta). Capturas en CAPTURAS (por defecto ~/Downloads).
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

// Lunes 2026-10-05 10:00 en Managua = 16:00 UTC
const AHORA = Date.UTC(2026, 9, 5, 16, 0);
const hr = (d, a, c, cerrado = false) => ({ dia_semana: d, hora_apertura: a, hora_cierre: c, cerrado });
const horarios = [hr(0, null, null, true), ...[1, 2, 3, 4, 5, 6].map((d) => hr(d, '08:00:00', '18:00:00'))];
const FOTO = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='300'><rect width='400' height='300' fill='%2354C8C0'/></svg>";
const datos = (config = {}) => ({
  negocio: { config_diseno: config, logo_url: null },
  horarios,
  productos: [{ id: 1, nombre: 'Café de altura', orden: 1 }, { id: 2, nombre: 'Cacao', orden: 2 }, { id: 3, nombre: 'Pan dulce', orden: 3 }],
  fotos: [{ url: FOTO }],
  actividades: [{ id: 9, nombre: 'Noche de danza', descripcion: 'Música en vivo', fecha_inicio: '2026-10-17', fecha_fin: '2026-10-18', estado_sello: 'aprobado' }],
});

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});

async function abrir(ancho, vista, db, alto = 900) {
  const ctx = await browser.newContext({ viewport: { width: ancho, height: alto }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  const errores = [];
  page.on('pageerror', (e) => errores.push(e.message));
  await page.addInitScript(([d, ahora]) => { window.__db = d; Date.now = () => ahora; }, [db, AHORA]);
  await page.goto(`${base}?vista=${vista}`);
  return { ctx, page, errores };
}
const variable = (page, nombre) => page.evaluate((n) => getComputedStyle(document.querySelector('.perfilpublico-ficha')).getPropertyValue(n).trim(), nombre);
const titulos = (page, raiz = '') => page.$$eval(`${raiz} .perfilpublico-seccion-titulo`, (els) => els.map((e) => e.textContent.trim()));
const sinDesborde = (page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);

for (const ancho of [360, 412]) {
  const t = `[${ancho}px]`;

  // 1. Ficha con los valores por defecto ({} en la base)
  {
    const { ctx, page, errores } = await abrir(ancho, 'ficha', datos({}));
    await page.waitForSelector('.perfilpublico-nombre');
    await page.waitForSelector('.resenas-seccion');
    ok(await variable(page, '--ficha-color') === '#1B2A6B', `${t} defecto: paleta azul_marino`);
    ok(await page.locator('.perfilpublico-pastilla--abierto').innerText() === 'Abierto ahora · cierra 6:00 PM', `${t} "Abierto ahora · cierra 6:00 PM" (lunes 10:00 en Managua)`);
    ok((await titulos(page)).join('|') === 'Horarios|Productos|Fotos|Actividades|Reseñas', `${t} defecto: orden Horarios, Productos, Fotos, Actividades, Reseñas`);
    ok(await page.locator('.perfilpublico-horarios li').first().innerText().then((x) => /Lun a Sáb\s*8:00 AM - 6:00 PM/.test(x.replace(/\n/g, ' '))), `${t} horarios agrupados "Lun a Sáb 8:00 AM - 6:00 PM"`);
    ok(await page.locator('.perfilpublico-whatsapp').count() === 0, `${t} sin WhatsApp no hay botón`);
    ok(await page.locator('.perfilpublico-productos.perfilpublico-cuadricula').count() === 1, `${t} productos en cuadrícula por defecto`);
    ok(await page.locator('.perfilpublico-pastilla', { hasText: '4.6' }).count() === 1, `${t} calificación en la cabecera`);
    ok(await sinDesborde(page), `${t} ficha sin desborde horizontal`);
    ok(errores.length === 0, `${t} ficha sin errores de página${errores.length ? ': ' + errores[0] : ''}`);
    await page.waitForTimeout(600); // termina la animación de entrada
    await page.screenshot({ path: path.join(capturas, `diseno_ficha_defecto_${ancho}.png`) });
    await ctx.close();
  }

  // 2. Ficha con diseño guardado: terracota, elegante, WhatsApp, 3 secciones en otro orden, lista
  {
    const cfg = { paleta: 'terracota', letra: 'elegante', whatsapp: '87074097', secciones_visibles: ['resenas', 'productos', 'horarios'], layout_productos: 'lista', portada_url: null };
    const { ctx, page, errores } = await abrir(ancho, 'ficha', datos(cfg));
    await page.waitForSelector('.perfilpublico-whatsapp');
    await page.waitForSelector('.resenas-seccion');
    ok(await variable(page, '--ficha-color') === '#C0622A', `${t} guardado: paleta terracota`);
    ok((await variable(page, '--ficha-titulo')).includes('Playfair Display'), `${t} guardado: letra elegante (Playfair Display)`);
    ok(await page.locator('.perfilpublico-whatsapp').getAttribute('href') === 'https://wa.me/50587074097', `${t} WhatsApp de 8 dígitos abre wa.me/505…`);
    ok((await titulos(page)).join('|') === 'Reseñas|Productos|Horarios', `${t} guardado: orden Reseñas, Productos, Horarios (Fotos y Actividades ocultas)`);
    ok(await page.locator('.perfilpublico-productos.perfilpublico-lista').count() === 1, `${t} productos en lista`);
    const fondo = await page.locator('.perfilpublico-whatsapp').evaluate((e) => getComputedStyle(e).backgroundColor);
    ok(fondo === 'rgb(192, 98, 42)', `${t} el botón de WhatsApp usa el color de la paleta (${fondo})`);
    ok(await sinDesborde(page), `${t} sin desborde horizontal`);
    ok(errores.length === 0, `${t} sin errores de página`);
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(capturas, `diseno_ficha_terracota_${ancho}.png`) });
    await ctx.close();
  }

  // 3. Valores corruptos en la base: la ficha no se rompe y cae a los defaults
  {
    const { ctx, page, errores } = await abrir(ancho, 'ficha', datos({ paleta: 'rosa', letra: 5, whatsapp: 'abc', secciones_visibles: 'x', layout_productos: 'grid', otra: 1 }));
    await page.waitForSelector('.perfilpublico-nombre');
    ok(await variable(page, '--ficha-color') === '#1B2A6B', `${t} config corrupta: vuelve a azul_marino`);
    ok((await titulos(page)).length >= 3 && errores.length === 0, `${t} config corrupta: la ficha se dibuja completa y sin errores`);
    await ctx.close();
  }

  // 4. Negocio sin horarios: no hay "Abierto ahora" ni sección
  {
    const d = datos({});
    d.horarios = [];
    const { ctx, page } = await abrir(ancho, 'ficha', d);
    await page.waitForSelector('.perfilpublico-nombre');
    await page.waitForSelector('.resenas-seccion');
    ok(await page.locator('.perfilpublico-pastilla--abierto').count() === 0 && (await page.getByText(/Cerrado ·/).count()) === 0, `${t} sin horarios: ni Abierto ni Cerrado`);
    ok(!(await titulos(page)).includes('Horarios'), `${t} sin horarios: no hay sección Horarios`);
    await ctx.close();
  }

  // 5. Editor
  {
    const { ctx, page, errores } = await abrir(ancho, 'editor', datos({}));
    await page.waitForSelector('.editor-diseno');
    await page.waitForSelector('.resenas-seccion');
    const vistaVar = (n) => page.evaluate((x) => getComputedStyle(document.querySelector('.editor-diseno-vista .perfilpublico-ficha')).getPropertyValue(x).trim(), n);
    ok(await page.locator('.editor-diseno-paleta').count() === 8, `${t} editor: 8 paletas`);
    ok(await page.locator('.editor-diseno-paleta[aria-checked="true"]').getAttribute('aria-label') === 'Azul marino', `${t} editor: azul marino seleccionada`);
    ok(await page.getByRole('button', { name: 'Guardar' }).isDisabled() && await page.getByRole('button', { name: 'Deshacer' }).isDisabled(), `${t} editor: sin cambios, Guardar y Deshacer desactivados`);
    ok(await page.locator('.editor-diseno-seccion').count() === 5, `${t} editor: 5 secciones en la lista`);
    ok(await sinDesborde(page), `${t} editor sin desborde horizontal`);

    await page.getByRole('radio', { name: 'Terracota' }).click();
    ok(await vistaVar('--ficha-color') === '#C0622A', `${t} editor: elegir Terracota cambia la vista previa al instante`);
    await page.getByRole('radio', { name: 'Moderna' }).click();
    ok((await vistaVar('--ficha-titulo')).includes('Poppins'), `${t} editor: elegir Moderna cambia la letra de la vista previa`);
    await page.getByRole('radio', { name: 'Lista' }).click();
    ok(await page.locator('.editor-diseno-vista .perfilpublico-productos.perfilpublico-lista').count() === 1, `${t} editor: Lista cambia productos en la vista previa`);

    await page.getByRole('switch', { name: 'Mostrar Fotos' }).click();
    ok(!(await titulos(page, '.editor-diseno-vista')).includes('Fotos'), `${t} editor: ocultar Fotos la quita de la vista previa`);
    for (let i = 0; i < 4; i += 1) await page.getByRole('button', { name: 'Subir Reseñas' }).click();
    const orden = (await titulos(page, '.editor-diseno-vista')).join('|');
    ok(orden === 'Reseñas|Horarios|Productos|Actividades', `${t} editor: Reseñas al principio -> ${orden}`);
    ok(await page.getByRole('button', { name: 'Subir Reseñas' }).isDisabled(), `${t} editor: la primera no puede subir`);

    const campo = page.getByRole('textbox', { name: 'Botón de WhatsApp' });
    await campo.fill('+505 8707-40');
    ok(await campo.inputValue() === '505870740', `${t} editor: el campo deja solo dígitos (${await campo.inputValue()})`);
    await campo.fill('1234');
    ok(await page.getByRole('button', { name: 'Guardar' }).isDisabled(), `${t} editor: 4 dígitos -> Guardar desactivado`);
    ok(await page.getByText('Escribe entre 8 y 15 dígitos, solo números.').isVisible(), `${t} editor: aviso de 8 a 15 dígitos`);
    await campo.fill('87074097');
    ok(await page.getByRole('button', { name: 'Guardar' }).isEnabled(), `${t} editor: 8 dígitos -> Guardar activo`);
    ok(await page.locator('.editor-diseno-vista .perfilpublico-whatsapp').getAttribute('href') === 'https://wa.me/50587074097', `${t} editor: aparece el botón de WhatsApp en la vista previa`);

    await page.setInputFiles('input[type=file]', { name: 'portada.png', mimeType: 'image/png', buffer: Buffer.from('x') });
    await page.waitForSelector('.editor-diseno-vista .perfilpublico-portada-foto');
    ok(true, `${t} editor: la portada subida aparece en la vista previa`);
    ok(await page.getByRole('button', { name: 'Cambiar foto de portada' }).count() === 1, `${t} editor: el botón pasa a "Cambiar foto de portada"`);
    await page.screenshot({ path: path.join(capturas, `diseno_editor_${ancho}.png`), fullPage: true });

    await page.getByRole('button', { name: 'Deshacer' }).click();
    ok(await vistaVar('--ficha-color') === '#1B2A6B' && await page.locator('.editor-diseno-vista .perfilpublico-whatsapp').count() === 0, `${t} editor: Deshacer vuelve al último guardado`);
    ok(await page.getByRole('button', { name: 'Guardar' }).isDisabled(), `${t} editor: tras Deshacer, Guardar desactivado`);

    await page.getByRole('radio', { name: 'Verde' }).click();
    await page.getByRole('switch', { name: 'Mostrar Horarios' }).click();
    await campo.fill('50587074097');
    await page.getByRole('button', { name: 'Guardar' }).click();
    await page.getByText('Diseño guardado. Así lo ven los turistas.').waitFor();
    const llamadas = await page.evaluate(() => window.__llamadas);
    const guardada = llamadas.filter((l) => l[0] === 'guardar').pop()[1];
    ok(JSON.stringify(guardada) === JSON.stringify({ paleta: 'verde', letra: 'clasica', portada_url: null, whatsapp: '50587074097', secciones_visibles: ['productos', 'fotos', 'actividades', 'resenas'], layout_productos: 'cuadricula' }),
      `${t} editor: Guardar envía las seis claves y nada más -> ${JSON.stringify(guardada)}`);
    ok(await page.getByRole('button', { name: 'Guardar' }).isDisabled(), `${t} editor: tras guardar, Guardar desactivado`);
    ok(errores.length === 0, `${t} editor sin errores de página${errores.length ? ': ' + errores[0] : ''}`);
    await ctx.close();
  }

  // 6. Editor: error al guardar
  {
    const d = datos({});
    d.falla = true;
    const { ctx, page } = await abrir(ancho, 'editor', d);
    await page.waitForSelector('.editor-diseno');
    await page.getByRole('radio', { name: 'Rojo' }).click();
    await page.getByRole('button', { name: 'Guardar' }).click();
    ok(await page.getByRole('alert').filter({ hasText: 'No se pudo guardar el diseño' }).isVisible(), `${t} editor: el error de la base se muestra`);
    ok(await page.getByRole('button', { name: 'Guardar' }).isEnabled(), `${t} editor: tras el error se puede reintentar`);
    await ctx.close();
  }
}

// Escritorio: dos columnas
{
  const { ctx, page } = await abrir(1280, 'editor', datos({}), 900);
  await page.waitForSelector('.editor-diseno-vista .perfilpublico-ficha');
  const cajas = await page.evaluate(() => {
    const a = document.querySelector('.editor-diseno-columna').getBoundingClientRect();
    const b = document.querySelector('.editor-diseno-vista').getBoundingClientRect();
    return { izquierda: a.left, derecha: b.left, topA: a.top, topB: b.top };
  });
  ok(cajas.derecha > cajas.izquierda + 300 && Math.abs(cajas.topA - cajas.topB) < 40, `[1280px] editor a la izquierda y vista previa a la derecha (${Math.round(cajas.izquierda)} / ${Math.round(cajas.derecha)})`);
  await page.screenshot({ path: path.join(capturas, 'diseno_editor_1280.png') });
  await ctx.close();
}

await browser.close();
await servidor.close();
console.log(`\nRESULTADO: ${total - fallas.length} de ${total} comprobaciones correctas${fallas.length ? ` (${fallas.length} FALLAN)` : ''}`);
fallas.forEach((f) => console.log(' - ' + f));
process.exit(fallas.length ? 1 : 0);
