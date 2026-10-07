// Prueba de la barra inferior (BottomNav): Inicio · Pasaporte · Eventos · Avatar, y qué ítem se resalta en cada pantalla.
// Uso (desde la raíz del proyecto):  node docs/tests/sitio_front/nav.test.mjs   (requiere playwright; CHROMIUM_PATH opcional)
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

async function abrir(ancho, query, avatar = null) {
  const ctx = await browser.newContext({ viewport: { width: ancho, height: 700 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  const errores = [];
  page.on('pageerror', (e) => errores.push(e.message));
  await page.addInitScript((a) => { window.__db = { uid: 'yo', sesion: true, llamadas: [], fotos: [], resenas: [] }; if (a) localStorage.setItem('avatarElegido', a); }, avatar);
  await page.goto(`${base}?${query}`);
  await page.waitForSelector('.bottom-nav');
  await page.waitForTimeout(300);
  return { ctx, page, errores };
}

for (const ancho of [360, 412]) {
  const t = `[${ancho}px]`;
  // orden y etiquetas
  const { ctx, page, errores } = await abrir(ancho, 'vista=nav&activo=inicio');
  const etiquetas = await page.locator('.bottom-nav-item').allTextContents();
  ok(etiquetas.join(',') === 'INICIO,PASAPORTE,EVENTOS,AVATAR', `${t} orden: ${etiquetas.join(' · ')}`);
  ok((await page.locator('.bottom-nav-item').count()) === 4, `${t} siguen 4 ítems en 4 columnas`);
  ok((await page.locator('[aria-label="PERFIL"]').count()) === 0, `${t} ya no hay ítem Perfil en la barra`);
  ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), `${t} sin desborde horizontal`);
  await page.screenshot({ path: path.join(capturas, `nav_avatar_${ancho}.png`) });
  // el ícono del avatar es el cabezón por defecto
  ok((await page.locator('[aria-label="AVATAR"] img').getAttribute('src')).includes('cabezon'), `${t} ícono del avatar: cabezón por defecto`);
  // navega a personalizacion
  await page.click('[aria-label="AVATAR"]');
  ok((await page.evaluate(() => window.__eventos.map((e) => e[1]).join(','))) === 'personalizacion', `${t} Avatar navega a 'personalizacion'`);
  ok(errores.length === 0, `${t} sin errores de página`);
  await ctx.close();

  // ícono de la gigantona si esa es la elegida
  const g = await abrir(ancho, 'vista=nav&activo=inicio', 'gigantona');
  ok((await g.page.locator('[aria-label="AVATAR"] img').getAttribute('src')).includes('gigantona'), `${t} ícono del avatar: gigantona si la elegiste`);
  await g.ctx.close();

  // ítem resaltado por pantalla: [activo recibido, aria-label esperado resaltado o null]
  for (const [activo, esperado] of [['inicio', 'INICIO'], ['pasaporte', 'PASAPORTE'], ['eventos', 'EVENTOS'], ['personalizacion', 'AVATAR'], ['perfil', null], ['mapa', null]]) {
    const r = await abrir(ancho, `vista=nav&activo=${activo}`);
    const resaltados = await r.page.locator('.bottom-nav-item.activo').evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')));
    ok(esperado === null ? resaltados.length === 0 : resaltados.length === 1 && resaltados[0] === esperado, `${t} pantalla '${activo}': resalta ${esperado ?? 'ningún ítem'} (resaltó: ${resaltados.join(',') || 'ninguno'})`);
    await r.ctx.close();
  }

  // la pantalla de personalización muestra la barra con Avatar resaltado, sin taparle el contenido
  const p = await abrir(ancho, 'vista=personalizacion');
  ok((await p.page.locator('.bottom-nav-item.activo').getAttribute('aria-label')) === 'AVATAR', `${t} Personalización: Avatar resaltado`);
  await p.page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  const libre = await p.page.evaluate(() => {
    const ultimo = document.querySelector('.personalizacion-tienda').getBoundingClientRect().bottom;
    return ultimo <= document.querySelector('.bottom-nav').getBoundingClientRect().top ? 'libre' : 'tapado';
  });
  ok(libre === 'libre', `${t} Personalización: al final del contenido la barra no tapa nada`);
  await p.page.screenshot({ path: path.join(capturas, `nav_personalizacion_${ancho}.png`) });
  ok(p.errores.length === 0, `${t} Personalización sin errores de página (${p.errores.join('; ')})`);
  await p.ctx.close();
}

await browser.close();
await servidor.close();
console.log(`\n${total - fallas.length}/${total} comprobaciones`);
if (fallas.length) { console.log('FALLAS:\n' + fallas.join('\n')); process.exit(1); }
