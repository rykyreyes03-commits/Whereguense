// Pruebas del tema claro / oscuro.
//  - Menú: "Tema" abre un selector real (sin aviso "próximamente") y cambia el tema al instante, con y sin modo emprendedor.
//  - Persistencia: clave 'tema' en localStorage; el script de index.html aplica el tema antes de dibujar (sin parpadeo).
//  - El modo claro conserva sus colores de siempre; el oscuro no deja superficies claras ni texto ilegible en las pantallas clave.
// Uso (desde la raíz del proyecto):  node docs/tests/sitio_front/tema.test.mjs   (requiere playwright; CHROMIUM_PATH opcional)
import { createServer } from 'vite';
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const servidor = await createServer({ configFile: path.join(aqui, 'vite.config.mjs') });
await servidor.listen();
const base = 'http://localhost:5198/';
let total = 0;
const fallas = [];
const ok = (cond, texto) => { total += 1; if (!cond) fallas.push(texto); console.log(`${cond ? 'OK   ' : 'FALLA'} ${texto}`); };
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});

const BD = {
  uid: 'yo', sesion: true, llamadas: [], fotos: [], resenas: [],
  nivel: { nivel_actual: 3, puntos_actuales: 0.5, puntos_para_siguiente: 6, porcentaje: 8, puntos_totales: 6.5 }, sitioFila: [{ id: 1, rango: 'oro' }],
};
async function abrir(query, esperar, { ancho = 390, dialogos = null } = {}) {
  const ctx = await browser.newContext({ viewport: { width: ancho, height: 800 }, locale: 'en-US' });
  const page = await ctx.newPage();
  const errores = [];
  page.on('pageerror', (e) => errores.push(e.message));
  if (dialogos) page.on('dialog', (d) => { dialogos.push(d.message()); d.dismiss(); });
  await page.addInitScript((bd) => { window.__db = bd; }, BD);
  await page.goto(`${base}?${query}`);
  await page.waitForSelector(esperar);
  await page.waitForTimeout(300);
  return { ctx, page, errores };
}
const colorDe = (page, selector, propiedad) => page.evaluate(([s, p]) => getComputedStyle(document.querySelector(s))[p], [selector, propiedad]);
const esOscuro = (page) => page.evaluate(() => document.documentElement.classList.contains('dark'));

// ---------- el selector del menú, en turista y en emprendedor ----------
for (const [nombre, query] of [['turista', 'vista=menu'], ['emprendedor', 'vista=menu&negocio=1']]) {
  const dialogos = [];
  const { ctx, page, errores } = await abrir(query, '.menu-lista', { dialogos });
  ok(!(await esOscuro(page)), `${nombre}: empieza en tema claro`);
  await page.click('.menu-item:has-text("Tema")');
  ok(dialogos.length === 0, `${nombre}: "Tema" ya no lanza el aviso "próximamente"`);
  const opciones = await page.locator('.menu-selector-opcion').allTextContents();
  ok(opciones.join(',') === 'Claro,Oscuro', `${nombre}: el selector ofrece Claro y Oscuro (${opciones.join(',')})`);
  ok((await page.locator('.menu-selector-opcion[aria-checked="true"]').textContent()) === 'Claro', `${nombre}: Claro está marcado`);
  ok((await page.locator('.menu-selector-opcion svg').count()) === 2, `${nombre}: cada opción lleva su ícono (sol y luna)`);
  const alto = await page.locator('.menu-selector-opcion').first().boundingBox();
  ok(alto.height >= 44, `${nombre}: las opciones miden al menos 44 px de alto (${Math.round(alto.height)})`);

  await page.click('.menu-selector-opcion:has-text("Oscuro")');
  await page.waitForTimeout(150);
  ok(await esOscuro(page), `${nombre}: Oscuro pone la clase "dark" en <html> al instante`);
  ok((await page.evaluate(() => localStorage.getItem('tema'))) === 'oscuro', `${nombre}: la preferencia queda en localStorage ('tema' = oscuro)`);
  ok((await page.locator('.menu-selector-opcion[aria-checked="true"]').textContent()) === 'Oscuro', `${nombre}: ahora Oscuro está marcado`);
  ok((await colorDe(page, 'body', 'backgroundColor')) === 'rgb(18, 18, 28)', `${nombre}: el fondo de la app pasa a oscuro`);
  ok((await colorDe(page, '.menu-lista', 'backgroundColor')) === 'rgb(29, 29, 43)', `${nombre}: la lista del menú es una tarjeta oscura`);
  ok((await colorDe(page, '.menu-item-texto', 'color')) === 'rgb(236, 236, 244)', `${nombre}: el texto pasa a claro`);
  ok((await page.locator('.menu-item:has-text("Tema")').getAttribute('aria-expanded')) === 'true', `${nombre}: la opción indica que está desplegada`);

  await page.click('.menu-item:has-text("Cambiar idioma")');
  ok((await page.locator('.menu-selector-opcion').allTextContents()).join(',') === 'Español,English', `${nombre}: abrir el idioma cierra el selector de tema`);
  await page.click('.menu-item:has-text("Tema")');
  await page.click('.menu-selector-opcion:has-text("Claro")');
  await page.waitForTimeout(150);
  ok(!(await esOscuro(page)), `${nombre}: Claro quita la clase "dark"`);
  ok((await page.evaluate(() => localStorage.getItem('tema'))) === 'claro', `${nombre}: la preferencia queda en 'claro'`);
  ok((await colorDe(page, 'body', 'backgroundColor')) === 'rgb(242, 242, 242)', `${nombre}: el fondo vuelve al gris claro de siempre`);
  await page.click('.menu-item:has-text("Notificaciones")');
  ok(dialogos.length === 1 && dialogos[0].startsWith('Notificaciones'), `${nombre}: las demás opciones siguen con su aviso (${dialogos[0]})`);
  ok(errores.length === 0, `${nombre}: sin errores de página (${errores.join('; ')})`);
  await ctx.close();
}

// ---------- el tema se conserva al volver a abrir ----------
{
  const { ctx, page } = await abrir('vista=menu&tema=oscuro', '.menu-lista');
  ok(await esOscuro(page), 'con la preferencia guardada, la app abre en oscuro');
  await page.reload();
  await page.waitForSelector('.menu-lista');
  ok(await esOscuro(page), 'y sigue en oscuro tras recargar');
  await ctx.close();
}

// ---------- sin parpadeo: el script de index.html aplica el tema antes de que React dibuje ----------
{
  const html = readFileSync(path.join(aqui, '../../../index.html'), 'utf8');
  const script = html.match(/<script>([\s\S]*?)<\/script>/)?.[1] || '';
  ok(script.includes("localStorage.getItem('tema')") && html.indexOf('<script>') < html.indexOf('<link') && html.indexOf('<script>') < html.indexOf('type="module"'),
    'index.html trae el script del tema en el <head>, antes de las hojas de estilo y de la app');
  const { ctx, page } = await abrir('vista=menu', '.menu-lista');
  const probar = (guardado) => page.evaluate(([valor, codigo]) => {
    document.documentElement.classList.remove('dark');
    localStorage.setItem('tema', valor);
    new Function(codigo)();
    return document.documentElement.classList.contains('dark');
  }, [guardado, script]);
  ok((await probar('oscuro')) === true, 'el script pone "dark" si lo guardado es oscuro');
  ok((await probar('claro')) === false, 'y no la pone si lo guardado es claro');
  ok((await probar('cualquier-cosa')) === false, 'ni con un valor raro');
  const sinAlmacenamiento = await page.evaluate((codigo) => {
    const original = Storage.prototype.getItem;
    Storage.prototype.getItem = () => { throw new Error('bloqueado'); };
    try { new Function(codigo)(); return 'sin error'; } catch (e) { return `error: ${e.message}`; } finally { Storage.prototype.getItem = original; }
  }, script);
  ok(sinAlmacenamiento === 'sin error', `si el almacenamiento está bloqueado, el script no rompe la app (${sinAlmacenamiento})`);
  await ctx.close();
}

// ---------- src/tema.js ----------
{
  const { ctx, page } = await abrir('vista=menu', '.menu-lista');
  const r = await page.evaluate(async () => {
    const { temaGuardado, cambiarTema } = await import('/src/tema.js');
    const salida = {};
    localStorage.removeItem('tema'); salida.sinGuardar = temaGuardado();
    localStorage.setItem('tema', 'raro'); salida.raro = temaGuardado();
    cambiarTema('raro'); salida.tras = localStorage.getItem('tema');
    cambiarTema('oscuro'); salida.oscuro = [temaGuardado(), document.documentElement.classList.contains('dark')];
    cambiarTema('claro'); salida.claro = [temaGuardado(), document.documentElement.classList.contains('dark')];
    return salida;
  });
  ok(r.sinGuardar === 'claro' && r.raro === 'claro', 'sin preferencia (o con una inválida) el tema es claro');
  ok(r.tras === 'raro', 'cambiarTema ignora valores inválidos (no toca lo guardado)');
  ok(r.oscuro[0] === 'oscuro' && r.oscuro[1] === true && r.claro[0] === 'claro' && r.claro[1] === false, 'cambiarTema guarda y aplica en los dos sentidos');
  await ctx.close();
}

// ---------- el modo claro conserva sus colores de siempre ----------
{
  const { ctx, page } = await abrir('vista=pasaporte', '.nivel-progreso');
  ok((await colorDe(page, 'body', 'backgroundColor')) === 'rgb(242, 242, 242)', 'claro: fondo de la app #F2F2F2');
  ok((await colorDe(page, '.nivel-progreso', 'backgroundColor')) === 'rgb(255, 255, 255)', 'claro: las tarjetas siguen blancas');
  ok((await colorDe(page, '.nivel-progreso-nivel', 'color')) === 'rgb(26, 26, 46)', 'claro: los títulos siguen en navy #1A1A2E');
  ok((await colorDe(page, '.nivel-progreso-puntos', 'color')) === 'rgb(30, 42, 120)', 'claro: los textos de acento siguen en índigo #1E2A78');
  await page.click('.ciudad-card:has-text("León")');
  await page.waitForSelector('.sello-card.obtenido');
  ok((await colorDe(page, '.sello-card.obtenido', 'backgroundColor')) === 'rgb(238, 240, 255)', 'claro: la tarjeta de sello obtenido conserva su tinte #EEF0FF');
  await ctx.close();
}

// ---------- el modo oscuro: sin superficies claras ni texto ilegible ----------
function auditar() {
  const parse = (c) => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const [r, g, b, a = 1] = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return { r, g, b, a }; };
  const lum = ({ r, g, b }) => { const f = (v) => { const x = v / 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const contraste = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
  const fondoDe = (el) => {
    for (let e = el; e; e = e.parentElement) {
      const cs = getComputedStyle(e);
      if (cs.backgroundImage && cs.backgroundImage !== 'none') return { degradado: true };
      const c = parse(cs.backgroundColor);
      if (c && c.a > 0.9) return c;
    }
    return { r: 255, g: 255, b: 255, a: 1 };
  };
  const malos = [];
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const vistos = new Set();
  while (w.nextNode()) {
    const n = w.currentNode;
    const el = n.parentElement;
    if (!n.nodeValue.trim() || !el || vistos.has(el)) continue;
    vistos.add(el);
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    if (!r.width || !r.height || cs.visibility === 'hidden' || cs.display === 'none') continue;
    // los emojis (candado de las piezas bloqueadas) llevan su propio color
    if (!/[A-Za-zÁ-ú0-9]/.test(n.nodeValue)) continue;
    const fondo = fondoDe(el);
    const col = parse(cs.color);
    if (fondo.degradado || !col) continue;
    const efectivo = { r: col.r * col.a + fondo.r * (1 - col.a), g: col.g * col.a + fondo.g * (1 - col.a), b: col.b * col.a + fondo.b * (1 - col.a) };
    const c = contraste(efectivo, fondo);
    if (c < 3) malos.push(`${el.tagName.toLowerCase()}.${String(el.className).split(' ')[0]} "${n.nodeValue.trim().slice(0, 24)}" ${c.toFixed(1)}:1`);
  }
  const claras = [];
  for (const el of document.querySelectorAll('body *')) {
    const r = el.getBoundingClientRect();
    if (r.width < 120 || r.height < 36 || el.closest('[data-arnes]')) continue;
    const cs = getComputedStyle(el);
    if (cs.backgroundImage !== 'none') continue;
    const c = parse(cs.backgroundColor);
    if (c && c.a > 0.9 && lum(c) > 0.55) claras.push(`${el.tagName.toLowerCase()}.${String(el.className).split(' ')[0]}`);
  }
  return { malos: [...new Set(malos)], claras: [...new Set(claras)] };
}
const pantallas = [
  ['Inicio', 'vista=inicio', '.inicio-hero'], ['Eventos', 'vista=eventos', '.eventos-titulo'], ['Pasaporte', 'vista=pasaporte', '.nivel-progreso'],
  ['Perfil', 'vista=perfil', '.perfil-wrapper'], ['Perfil del emprendedor', 'vista=perfil&negocio=1', '.perfil-wrapper'], ['Menú', 'vista=menu', '.menu-lista'],
  ['Personalización', 'vista=personalizacion', '.personalizacion-wrapper'], ['Ficha del sitio', 'sitio=1', '.sitio-detalle-nombre'],
  ['Panel del emprendedor', 'vista=negocio', '.perfilnegocio-accesos'], ['Barra inferior', 'vista=nav&activo=inicio', '.bottom-nav'],
  ['Login', 'vista=login', '.login-form'], ['Landing', 'vista=landing', 'h1'], ['Ranking', 'vista=ranking', 'h1'], ['Guardados', 'vista=guardados', 'h1'],
  ['Registro de negocio', 'vista=registro', 'form, input'], ['Panel admin', 'vista=admin', 'h1, h2'], ['Detalle de evento', 'vista=detalleEvento', 'h1'],
];
for (const [nombre, query, esperar] of pantallas) {
  const { ctx, page } = await abrir(`${query}&tema=oscuro`, esperar);
  const r = await page.evaluate(auditar);
  ok(await esOscuro(page) && r.malos.length === 0, `oscuro · ${nombre}: sin texto de poco contraste${r.malos.length ? ` (${r.malos.join('; ')})` : ''}`);
  ok(r.claras.length === 0, `oscuro · ${nombre}: sin superficies claras${r.claras.length ? ` (${r.claras.join('; ')})` : ''}`);
  await ctx.close();
}

await browser.close();
await servidor.close();
console.log(`\n${total - fallas.length}/${total} comprobaciones`);
if (fallas.length) { console.log('FALLAS:\n' + fallas.join('\n')); process.exit(1); }
