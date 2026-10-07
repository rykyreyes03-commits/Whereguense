// Pruebas del pasaporte de viajero (PasaporteVisual): la tarjeta "Mi pasaporte", el documento con los datos del usuario,
// los sellos con la marca SELLADO, el "+N", el cierre, y los datos de apoyo (ruta favorita, número de pasaporte).
// Uso (desde la raíz del proyecto):  node docs/tests/sitio_front/pasaporte.test.mjs   (requiere playwright; CHROMIUM_PATH opcional)
import { createServer } from 'vite';
import { chromium } from 'playwright';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { rutaFavorita, numeroDePasaporte } from '../../../src/utils/pasaporte.js';

const aqui = path.dirname(fileURLToPath(import.meta.url));
let total = 0;
const fallas = [];
const ok = (cond, texto) => { total += 1; if (!cond) fallas.push(texto); console.log(`${cond ? 'OK   ' : 'FALLA'} ${texto}`); };

// ---------- datos de apoyo (sin navegador) ----------
const sitiosA = [{ id: 1 }, { id: 2 }, { id: 3 }];
const sitiosB = [{ id: 10 }, { id: 11 }];
const rutas = [{ id: 1, nombre: 'Ruta A', sitios: sitiosA }, { id: 2, nombre: 'Ruta B', sitios: sitiosB }];
ok(rutaFavorita(rutas, [{ sitioId: 1 }, { sitioId: 10 }, { sitioId: 11 }])?.nombre === 'Ruta B', 'ruta favorita: la que tiene más sellos (2 en B contra 1 en A)');
ok(rutaFavorita(rutas, [{ sitioId: 1 }, { sitioId: 10 }])?.nombre === 'Ruta A', 'ruta favorita: en empate gana la primera');
ok(rutaFavorita(rutas, []) === null, 'ruta favorita: sin sellos no hay ruta');
ok(rutaFavorita(rutas, [{ sitioId: null }, { sitioId: 99 }]) === null, 'ruta favorita: un sello de QR de negocio o de un sitio sin ruta no cuenta');
ok(rutaFavorita(rutas, [{ sitioId: 1 }, { sitioId: 1 }])?.nombre === 'Ruta A', 'ruta favorita: un sitio repetido no cuenta doble');
ok(rutaFavorita(undefined, [{ sitioId: 1 }]) === null, 'ruta favorita: sin rutas -> null');
ok(numeroDePasaporte('3f9a1c2e-5b7d-4e08-9a41-c0ffee123456') === '#3f9a1c', 'número: "#" + los primeros 6 caracteres del id');
ok(numeroDePasaporte(null) === '#------' && numeroDePasaporte(undefined) === '#------', 'número: sin sesión "#------"');

// ---------- el documento en pantalla ----------
const servidor = await createServer({ configFile: path.join(aqui, 'vite.config.mjs') });
await servidor.listen();
const base = 'http://localhost:5198/';
const capturas = process.env.CAPTURAS || path.join(os.homedir(), 'Downloads');
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const BD = {
  uid: 'yo', sesion: true, llamadas: [], fotos: [], resenas: [],
  nivel: { nivel_actual: 3, puntos_actuales: 0.5, puntos_para_siguiente: 6, porcentaje: 8, puntos_totales: 6.5 }, sitioFila: [],
};
async function abrir(query, { ancho = 390, alto = 800, local = null } = {}) {
  const ctx = await browser.newContext({ viewport: { width: ancho, height: alto }, locale: 'en-US', deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  const errores = [];
  page.on('pageerror', (e) => errores.push(e.message));
  await page.addInitScript(([bd, loc]) => {
    window.__db = bd;
    if (loc) for (const [k, v] of Object.entries(loc)) localStorage.setItem(k, v);
  }, [BD, local]);
  await page.goto(`${base}?${query}&lang=es`);
  await page.waitForSelector('.mis-sellos-pasaporte');
  await page.waitForTimeout(300);
  return { ctx, page, errores };
}
const abrirDoc = async (page) => { await page.click('.mis-sellos-pasaporte'); await page.waitForSelector('.pasaporte-doc'); await page.waitForTimeout(500); };
const txt = (page, sel) => page.locator(sel).first().textContent();

for (const ancho of [360, 412]) {
  const t = `[${ancho}px]`;
  const { ctx, page, errores } = await abrir('vista=pasaporte', { ancho });

  // ---- la tarjeta que reemplaza a "Mis cupones"
  const tarjeta = page.locator('.mis-sellos-pasaporte');
  ok((await tarjeta.locator('strong').textContent()) === 'Mi pasaporte' && (await tarjeta.locator('small').textContent()) === 'Ver tu pasaporte de viajero', `${t} la tarjeta dice "Mi pasaporte" / "Ver tu pasaporte de viajero"`);
  ok((await tarjeta.locator('svg').count()) === 2, `${t} lleva el ícono de pasaporte y la flecha → a la derecha`);
  ok((await page.locator('text=Mis cupones').count()) === 0, `${t} "Mis cupones" ya no está en el pasaporte`);
  const caja = await tarjeta.boundingBox();
  ok(caja.height >= 44, `${t} la tarjeta mide al menos 44 px de alto`);

  // ---- el documento
  await abrirDoc(page);
  const doc = page.locator('.pasaporte-doc');
  const d = await doc.boundingBox();
  ok(d.x >= 0 && d.x + d.width <= ancho + 1 && d.y >= 0 && d.y + d.height <= 800 + 1, `${t} el documento cabe en la pantalla (${Math.round(d.width)}x${Math.round(d.height)})`);
  ok((await doc.getAttribute('role')) === 'dialog' && (await doc.getAttribute('aria-label')) === 'Pasaporte de Ryky', `${t} es un diálogo accesible ("Pasaporte de Ryky")`);
  ok((await doc.evaluate((e) => getComputedStyle(e).backgroundImage)).includes('pasaporte_base'), `${t} la imagen pasaporte_base es el fondo`);
  ok((await txt(page, '.pasaporte-numero')).toLowerCase() === '#3f9a1c', `${t} número de pasaporte: # + 6 primeros caracteres del id`);
  ok((await txt(page, '.pasaporte-valor--nombre')) === 'Ryky', `${t} nombre de usuario`);
  ok((await txt(page, '.pasaporte-valor--nacionalidad')) === 'Nicaragua', `${t} nacionalidad: Nicaragua`);
  ok((await txt(page, '.pasaporte-valor--sellos')) === '4', `${t} cantidad de sellos: 4`);
  ok((await txt(page, '.pasaporte-valor--ruta')) === 'Ruta Dariana', `${t} ruta favorita: Ruta Dariana`);
  const foto = page.locator('.pasaporte-foto img');
  ok((await foto.getAttribute('src')).includes('cabezon') && !(await foto.getAttribute('class')).includes('perfil'), `${t} la foto es el personaje elegido (cabezón)`);

  // ---- los sellos
  ok((await page.locator('.pasaporte-sello').count()) === 3, `${t} 3 sellos de sitio (el de QR de negocio no va): 3 círculos llenos`);
  ok((await page.locator('.pasaporte-sello-insignia').count()) === 3 && (await page.locator('.pasaporte-sello-insignia').evaluateAll((els) => els.every((e) => e.complete && e.naturalWidth > 0))), `${t} cada círculo muestra la insignia de su sitio`);
  const marcas = await page.locator('.pasaporte-sello-marca > span').allTextContents();
  ok(marcas.length === 3 && marcas.every((m) => m === 'Sellado'), `${t} cada sello lleva la marca "SELLADO"`);
  const estilo = await page.locator('.pasaporte-sello-marca').first().evaluate((e) => { const c = getComputedStyle(e); const s = getComputedStyle(e.firstElementChild); return { color: c.color, giro: c.transform, borde: s.borderTopStyle, radio: s.borderTopLeftRadius, peso: s.fontWeight, mayus: s.textTransform }; });
  ok(estilo.color === 'rgb(198, 40, 40)', `${t} la marca es roja (${estilo.color})`);
  const m = estilo.giro.match(/matrix\(([-\d.e]+), ([-\d.e]+)/);
  const grados = m ? Math.round(Math.atan2(Number(m[2]), Number(m[1])) * 180 / Math.PI) : null;
  ok(grados === -15, `${t} la marca está rotada -15° (${grados}°)`);
  ok(estilo.borde === 'solid' && parseFloat(estilo.radio) > 10 && Number(estilo.peso) >= 800 && estilo.mayus === 'uppercase', `${t} borde circular, tipografía en negrita y mayúsculas`);
  // los círculos sin sello conservan el "?" impreso: no se dibuja nada encima
  ok((await page.locator('.pasaporte-sello--3, .pasaporte-sello--4, .pasaporte-sello--5').count()) === 0, `${t} los 3 círculos vacíos no se tocan (queda el "?" del documento)`);
  ok((await page.locator('.pasaporte-mas').count()) === 0, `${t} con 3 sellos no hay "+"`);
  await page.screenshot({ path: path.join(capturas, `pasaporte_visual_${ancho}.png`) });

  // ---- cerrar
  const x = page.locator('.pasaporte-cerrar');
  const xc = await x.boundingBox();
  ok(xc.width >= 44 && xc.height >= 44 && xc.x + xc.width > ancho - 60 && xc.y < 70, `${t} el botón X está arriba a la derecha y mide al menos 44 px`);
  ok((await page.evaluate(() => document.activeElement.className)) === 'pasaporte-cerrar', `${t} el foco entra en la X`);
  await x.click();
  ok((await page.locator('.pasaporte-doc').count()) === 0, `${t} la X cierra el pasaporte`);
  ok((await page.evaluate(() => document.activeElement.className)).includes('mis-sellos-pasaporte'), `${t} el foco vuelve a la tarjeta`);
  await abrirDoc(page);
  await page.keyboard.press('Escape');
  ok((await page.locator('.pasaporte-doc').count()) === 0, `${t} Escape cierra el pasaporte`);
  await abrirDoc(page);
  await page.mouse.click(ancho / 2, 790);
  ok((await page.locator('.pasaporte-doc').count()) === 0, `${t} tocar fuera cierra el pasaporte`);
  ok(errores.length === 0, `${t} sin errores de página (${errores.join('; ')})`);
  await ctx.close();
}

// ---- más de 6 sellos: se muestran 6 y un "+"
{
  const { ctx, page } = await abrir('vista=pasaporte&muchos=1');
  await abrirDoc(page);
  ok((await page.locator('.pasaporte-sello').count()) === 6, 'con 9 sellos se dibujan solo 6 círculos');
  ok((await txt(page, '.pasaporte-mas')) === '+3', 'y un "+3" abajo con los que faltan');
  ok((await txt(page, '.pasaporte-valor--sellos')) === '9', 'la cantidad de sellos sigue siendo 9');
  const ordenados = await page.locator('.pasaporte-sello').evaluateAll((els) => els.map((e) => ({ x: e.getBoundingClientRect().left, y: e.getBoundingClientRect().top })));
  ok(ordenados[0].y === ordenados[1].y && ordenados[2].y > ordenados[0].y && ordenados[4].y > ordenados[2].y && ordenados[1].x > ordenados[0].x, 'los círculos se llenan en orden: de izquierda a derecha y de arriba abajo');
  await page.screenshot({ path: path.join(capturas, 'pasaporte_visual_muchos.png') });
  await ctx.close();
}

// ---- sin sellos
{
  const { ctx, page } = await abrir('vista=pasaporte&sinsellos=1');
  await abrirDoc(page);
  ok((await txt(page, '.pasaporte-valor--sellos')) === '0' && (await txt(page, '.pasaporte-valor--ruta')) === 'Sin ruta aún', 'sin sellos: cantidad 0 y "Sin ruta aún"');
  ok((await page.locator('.pasaporte-sello').count()) === 0 && (await page.locator('.pasaporte-mas').count()) === 0, 'sin sellos: los 6 círculos conservan su "?"');
  await ctx.close();
}

// ---- personaje y foto
{
  const { ctx, page } = await abrir('vista=pasaporte&gigantona=1');
  await abrirDoc(page);
  ok((await page.locator('.pasaporte-foto img').getAttribute('src')).includes('gigantona'), 'si eligió la gigantona, es la que sale en la foto');
  await ctx.close();
}
{
  const foto = 'data:image/svg+xml;utf8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2260%22 height=%2260%22%3E%3Crect width=%2260%22 height=%2260%22 fill=%22%23c33%22/%3E%3C/svg%3E';
  const { ctx, page } = await abrir('vista=pasaporte', { local: { fotoPerfil: foto } });
  await abrirDoc(page);
  const img = page.locator('.pasaporte-foto img');
  ok((await img.getAttribute('src')) === foto && (await img.getAttribute('class')).includes('perfil'), 'si subió una foto de perfil, esa sale en lugar del personaje');
  await ctx.close();
}
{
  const { ctx, page } = await abrir('vista=pasaporte&invitado=1');
  await abrirDoc(page);
  ok((await txt(page, '.pasaporte-numero')) === '#------' && (await txt(page, '.pasaporte-valor--nombre')) === 'Invitado', 'invitado: "#------" y nombre "Invitado"');
  await ctx.close();
}

// ---- en inglés
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 800 }, locale: 'en-US' });
  const page = await ctx.newPage();
  await page.addInitScript((bd) => { window.__db = bd; }, BD);
  await page.goto(`${base}?vista=pasaporte&lang=en`);
  await page.waitForSelector('.mis-sellos-pasaporte');
  ok((await page.locator('.mis-sellos-pasaporte strong').textContent()) === 'My passport', 'en: la tarjeta dice "My passport"');
  await abrirDoc(page);
  ok((await txt(page, '.pasaporte-sello-marca > span')) === 'Stamped', 'en: la marca dice "STAMPED"');
  ok((await page.locator('.pasaporte-cerrar').getAttribute('aria-label')) === 'Close passport', 'en: el botón de cerrar se llama "Close passport"');
  await ctx.close();
}

// ---- pantalla chica y baja: el documento se ajusta al alto
{
  const { ctx, page } = await abrir('vista=pasaporte', { ancho: 360, alto: 560 });
  await abrirDoc(page);
  const d = await page.locator('.pasaporte-doc').boundingBox();
  ok(d.y >= 0 && d.y + d.height <= 560 + 1, `en una pantalla de 360x560 el documento cabe completo (${Math.round(d.width)}x${Math.round(d.height)})`);
  await ctx.close();
}

await browser.close();
await servidor.close();
console.log(`\n${total - fallas.length}/${total} comprobaciones`);
if (fallas.length) { console.log('FALLAS:\n' + fallas.join('\n')); process.exit(1); }
