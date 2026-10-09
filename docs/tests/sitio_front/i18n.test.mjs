// Pruebas del cambio de idioma (español / inglés).
//  1. Datos: es.json y en.json tienen las mismas claves y variables {{x}}; las fechas salen bien en los dos idiomas.
//  2. Pantallas (navegador): Inicio, Eventos, barra, Perfil con su selector de idioma, ficha del sitio y pasaporte, en inglés y español.
// Uso (desde la raíz del proyecto):  node docs/tests/sitio_front/i18n.test.mjs   (requiere playwright; CHROMIUM_PATH opcional)
import { createServer } from 'vite';
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fijarIdioma } from '../../../src/utils/idioma.js';
import { rangoCorto, rangoEscrito, rangoConAnio, rangoLargo, notaDiaSiguiente, fechaEscrita, etiquetaCategoria } from '../../../src/utils/eventos.js';

const aqui = path.dirname(fileURLToPath(import.meta.url));
let total = 0;
const fallas = [];
const ok = (cond, texto) => { total += 1; if (!cond) fallas.push(texto); console.log(`${cond ? 'OK   ' : 'FALLA'} ${texto}`); };

// ---------- 1. archivos de traducción ----------
const es = JSON.parse(readFileSync(path.join(aqui, '../../../src/locales/es.json'), 'utf8'));
const en = JSON.parse(readFileSync(path.join(aqui, '../../../src/locales/en.json'), 'utf8'));
const claves = (o, p = '') => Object.entries(o).flatMap(([k, v]) => (typeof v === 'object' ? claves(v, `${p}${k}.`) : [`${p}${k}`]));
const valor = (o, k) => k.split('.').reduce((x, p) => x[p], o);
const vars = (s) => [...s.matchAll(/{{(\w+)}}/g)].map((m) => m[1]).sort().join(',');
const kEs = claves(es);
const kEn = claves(en);
ok(kEs.length === kEn.length && kEs.every((k) => kEn.includes(k)), `es.json y en.json tienen las mismas ${kEs.length} claves`);
ok(kEs.every((k) => vars(valor(es, k)) === vars(valor(en, k))), 'cada clave usa las mismas variables {{x}} en los dos idiomas');
ok(kEs.every((k) => String(valor(es, k)).trim() !== '' && String(valor(en, k)).trim() !== ''), 'ninguna traducción está vacía');

// ---------- fechas y etiquetas ----------
fijarIdioma('es');
ok(rangoCorto('2026-10-16', '2026-10-27') === '16-27 OCT', 'es: rangoCorto "16-27 OCT"');
ok(rangoCorto('2026-10-30', '2026-11-02') === '30 OCT-2 NOV', 'es: rangoCorto entre meses');
ok(rangoEscrito('2026-10-05', '2026-10-06').startsWith('5 al 6 de octubre'), 'es: rangoEscrito "5 al 6 de octubre"');
ok(rangoConAnio('2026-10-16', '2026-10-27') === '16 — 27 de octubre de 2026', 'es: rangoConAnio');
ok(notaDiaSiguiente('19:00', '02:00') === 'Termina a las 2:00 AM del día siguiente', 'es: nota del día siguiente');
ok(etiquetaCategoria('gastronomia') === 'Gastronomía', 'es: categoría Gastronomía');
ok(fechaEscrita('2026-10-05') === 'lunes 5 de octubre', 'es: fechaEscrita "lunes 5 de octubre" (sin coma, como siempre)');
fijarIdioma('en');
ok(rangoCorto('2026-10-16', '2026-10-27') === 'OCT 16-27', 'en: rangoCorto "OCT 16-27"');
ok(rangoCorto('2026-10-16', '2026-10-16') === 'OCT 16', 'en: un solo día "OCT 16"');
ok(rangoCorto('2026-10-30', '2026-11-02') === 'OCT 30-NOV 2', 'en: rangoCorto entre meses');
ok(rangoLargo('2026-10-16', '2026-10-27') === 'October 16 - October 27', 'en: rangoLargo');
ok(rangoConAnio('2026-10-16', '2026-10-27') === 'October 16 — 27, 2026', 'en: rangoConAnio');
ok(rangoEscrito('2026-10-05', '2026-10-06').startsWith('October 5-6'), 'en: rangoEscrito "October 5-6"');
ok(notaDiaSiguiente('19:00', '02:00') === 'Ends at 2:00 AM the next day', 'en: nota del día siguiente');
ok(fechaEscrita('2026-10-05') === 'Monday, October 5', 'en: fechaEscrita "Monday, October 5"');
fijarIdioma('es');

// ---------- 2. pantallas ----------
const servidor = await createServer({ configFile: path.join(aqui, 'vite.config.mjs') });
await servidor.listen();
const base = 'http://localhost:5198/';
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});

const BD = { uid: 'yo', sesion: true, llamadas: [], fotos: [], resenas: [], nivel: { nivel_actual: 3, puntos_actuales: 0.5, puntos_para_siguiente: 6, porcentaje: 8, puntos_totales: 6.5 }, sitioFila: [{ id: 1, rango: 'oro' }] };

async function abrir(query, esperar, { locale = 'en-US', sinIdiomaFijo = false } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 800 }, locale });
  const page = await ctx.newPage();
  const errores = [];
  page.on('pageerror', (e) => errores.push(e.message));
  // sinIdiomaFijo: no se guarda ninguna preferencia, así manda el idioma del navegador
  if (sinIdiomaFijo) await page.route('**/idiomaPrueba.js', (r) => r.fulfill({ contentType: 'text/javascript', body: '' }));
  await page.addInitScript((bd) => { window.__db = bd; }, BD);
  await page.goto(`${base}?${query}`);
  await page.waitForSelector(esperar);
  await page.waitForTimeout(400);
  return { ctx, page, errores };
}
const texto = (page) => page.evaluate(() => document.body.innerText);

// Inicio
for (const [lang, esperados] of [
  ['en', ['Hello, Explorer', 'Quick access', 'Latest stamp', 'Featured routes', 'Next event', 'DARIAN ROUTES', 'You have no stamps yet', 'HOME', 'PASSPORT', 'EVENTS', 'AVATAR', '10/16 – 10/27']],
  ['es', ['Hola, Explorador', 'Accesos rápidos', 'Último sello', 'Rutas destacadas', 'Próximo evento', 'RUTAS DARIANAS', 'Aún no tienes sellos', 'INICIO', 'PASAPORTE', 'EVENTOS', 'AVATAR', '16/10 – 27/10']],
]) {
  const { ctx, page, errores } = await abrir(`vista=inicio&lang=${lang}`, '.inicio-hero');
  const t = await texto(page);
  for (const e of esperados) ok(t.includes(e), `Inicio (${lang}): "${e}"`);
  ok(errores.length === 0, `Inicio (${lang}): sin errores de página (${errores.join('; ')})`);
  if (lang === 'en') {
    ok(!/Hola|Accesos|Rutas destacadas|Aún no/.test(t), 'Inicio (en): no quedan textos en español');
    ok((await page.locator('html').getAttribute('lang')) === 'en', 'el atributo lang del documento es "en"');
  }
  await ctx.close();
}

// Eventos
for (const [lang, esperados] of [
  ['en', ['Events calendar', '2 events on the calendar', 'All', 'Today', 'This week', 'Gastronomy', 'Culture', 'OCT 16-27', 'NOV 5-6', 'View →']],
  ['es', ['Agenda de eventos', '2 eventos en la agenda', 'Todos', 'Hoy', 'Esta semana', 'Gastronomía', 'Cultura', '16-27 OCT', '5-6 NOV', 'Ver →']],
]) {
  const { ctx, page } = await abrir(`vista=eventos&lang=${lang}`, '.eventos-titulo');
  const t = await texto(page);
  for (const e of esperados) ok(t.includes(e), `Eventos (${lang}): "${e}"`);
  if (lang === 'en') {
    await page.fill('input[type="search"]', 'zzzz');
    ok((await texto(page)).includes('No events found for “zzzz”.'), 'Eventos (en): mensaje de búsqueda sin resultados');
    await page.click('text=Today');
    ok((await texto(page)).includes('No events found today for “zzzz”.'), 'Eventos (en): mensaje con el filtro "Today"');
    ok((await page.locator('input[type="search"]').getAttribute('placeholder')).startsWith('Search folklore'), 'Eventos (en): placeholder del buscador');
  }
  await ctx.close();
}

// Barra inferior
{
  const { ctx, page } = await abrir('vista=nav&activo=inicio&lang=en', '.bottom-nav');
  ok((await page.locator('.bottom-nav-item').allTextContents()).join(',') === 'HOME,PASSPORT,EVENTS,AVATAR', 'barra (en): HOME · PASSPORT · EVENTS · AVATAR');
  ok((await page.locator('nav.bottom-nav').getAttribute('aria-label')) === 'Main navigation', 'barra (en): aria-label "Main navigation"');
  ok((await page.locator('.bottom-nav-fab').getAttribute('aria-label')) === 'Open map', 'barra (en): botón del mapa "Open map"');
  await ctx.close();
}

// Perfil: el selector de idioma cambia el idioma de verdad
{
  const { ctx, page, errores } = await abrir('vista=perfil&lang=es', '.perfil-wrapper');
  ok((await texto(page)).includes('Datos de usuario') && (await texto(page)).includes('Cerrar sesión'), 'Perfil (es): textos en español al empezar');
  ok((await page.locator('.topbar-volver').textContent()).includes('Volver'), 'Perfil (es): ← Volver');
  await page.click('.perfil-editar-btn');
  ok((await page.locator('select option').allTextContents()).join(',') === 'Español,English', 'el selector ofrece Español y English');
  await page.selectOption('select', 'en');
  ok((await texto(page)).includes('Datos de usuario'), 'elegir English no cambia nada hasta guardar');
  await page.click('.perfil-guardar-btn');
  await page.waitForTimeout(400);
  const t = await texto(page);
  ok(t.includes('User details') && t.includes('Sign out') && t.includes('View my stamps') && t.includes('Preferred language'), 'al guardar, Perfil pasa a inglés');
  ok((await page.locator('.topbar-volver').textContent()).includes('Back'), 'Perfil (en): ← Back');
  ok((await page.evaluate(() => localStorage.getItem('idioma'))) === 'en', 'la preferencia queda guardada en localStorage');
  ok((await page.locator('html').getAttribute('lang')) === 'en', 'el atributo lang cambia a "en"');
  await page.click('.perfil-editar-btn');
  await page.selectOption('select', 'es');
  await page.click('.perfil-guardar-btn');
  await page.waitForTimeout(400);
  ok((await texto(page)).includes('Datos de usuario') && (await page.evaluate(() => localStorage.getItem('idioma'))) === 'es', 'se puede volver al español');
  ok(errores.length === 0, `Perfil: sin errores de página (${errores.join('; ')})`);
  await ctx.close();
}

// Idioma del navegador cuando no hay preferencia guardada
{
  const a = await abrir('vista=nav&activo=inicio', '.bottom-nav', { locale: 'en-GB', sinIdiomaFijo: true });
  ok((await a.page.locator('.bottom-nav-item').allTextContents()).join(',') === 'HOME,PASSPORT,EVENTS,AVATAR', 'sin preferencia guardada, un navegador en inglés (en-GB) abre la app en inglés');
  await a.ctx.close();
  const b = await abrir('vista=nav&activo=inicio', '.bottom-nav', { locale: 'fr-FR', sinIdiomaFijo: true });
  ok((await b.page.locator('.bottom-nav-item').allTextContents()).join(',') === 'INICIO,PASAPORTE,EVENTOS,AVATAR', 'un navegador en otro idioma (fr-FR) cae en español');
  await b.ctx.close();
}

// Ficha del sitio y pasaporte
for (const [lang, esperados] of [
  ['en', ['About this place', 'Read the full story', 'Did you know…?', 'Why does it matter?', 'Gives you a stamp for your passport', 'YOUR PASSPORT', 'Visit this place and earn your stamp!', 'GOLD stamp', '2 points', 'Reviews', 'No reviews yet', 'Write a review', 'View route', 'Go to the site', 'Historic site', 'Free entry', 'Suggested visit']],
  ['es', ['Sobre este lugar', 'Leer historia completa', '¿Sabías que…?', '¿Por qué es importante?', 'Entrega un sello para tu pasaporte', 'TU PASAPORTE', '¡Visita este lugar y obtén tu sello!', 'Sello de ORO', '2 puntos', 'Reseñas', 'Aún sin reseñas', 'Escribir reseña', 'Ver ruta', 'Llegar al sitio', 'Sitio histórico', 'Entrada libre', 'Visita recomendada']],
]) {
  const { ctx, page, errores } = await abrir(`sitio=1&lang=${lang}`, '.sitio-detalle-nombre');
  const t = await texto(page);
  for (const e of esperados) ok(t.includes(e), `Ficha del sitio (${lang}): "${e}"`);
  ok(errores.length === 0, `Ficha del sitio (${lang}): sin errores de página`);
  await ctx.close();
}
for (const [lang, esperados, enLeon] of [
  ['en', ['My stamps', 'Level 3', '0.5 / 6 points', 'To reach level 4: 5.5 more points', 'View ranking', 'My passport', 'View your traveler passport', 'PASSPORT', '3 of 89 stamps', 'Coming soon'], ['León stamps', 'All', 'My stamps', 'Gold', 'Copper', 'Collected on', 'Not stamped']],
  ['es', ['Mis sellos', 'Nivel 3', '0.5 / 6 puntos', 'Para el nivel 4: 5.5 puntos más', 'Ver ranking', 'Mi pasaporte', 'Ver tu pasaporte de viajero', 'PASAPORTE', '3 de 89 sellos', 'Próximamente'], ['Sellos de León', 'Todos', 'Mis sellos', 'Oro', 'Cobre', 'Obtenido el', 'Sin sellar']],
]) {
  const { ctx, page } = await abrir(`vista=pasaporte&lang=${lang}`, '.nivel-progreso');
  const t = await texto(page);
  for (const e of esperados) ok(t.includes(e), `Pasaporte (${lang}): "${e}"`);
  await page.click('.ciudad-card:has-text("León")');
  await page.waitForSelector('.sello-card');
  const tl = await texto(page);
  for (const e of enLeon) ok(tl.includes(e), `Sellos de León (${lang}): "${e}"`);
  await ctx.close();
}

await browser.close();
await servidor.close();
console.log(`\n${total - fallas.length}/${total} comprobaciones`);
if (fallas.length) { console.log('FALLAS:\n' + fallas.join('\n')); process.exit(1); }
