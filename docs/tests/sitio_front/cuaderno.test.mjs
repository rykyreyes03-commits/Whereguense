// Pruebas del registro del turista en forma de cuaderno (OnboardingCuaderno): portada, compañero, datos y bienvenida.
// Uso (desde la raíz del proyecto):  node docs/tests/sitio_front/cuaderno.test.mjs   (requiere playwright; CHROMIUM_PATH opcional)
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

// PNG de 1x1 para subir como foto
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

async function abrir(query = '', { ancho = 390, alto = 800 } = {}) {
  const ctx = await browser.newContext({ viewport: { width: ancho, height: alto }, locale: 'es-ES', deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  const errores = [];
  page.on('pageerror', (e) => errores.push(e.message));
  await page.addInitScript(() => { window.__db = { uid: 'yo', sesion: true, llamadas: [], fotos: [], resenas: [] }; window.__eventos = []; });
  await page.goto(`${base}?vista=cuaderno&lang=es${query}`);
  await page.waitForSelector('.oc-libro');
  await page.waitForTimeout(300);
  return { ctx, page, errores };
}
const espera = (page, ms = 1300) => page.waitForTimeout(ms);
const activa = (page) => page.locator('.oc-hoja:not([inert])');
const visible = async (page, sel) => (await page.locator(sel).first().isVisible());

// ---------- portada ----------
{
  const { ctx, page, errores } = await abrir();
  const libro = await page.locator('.oc-libro').boundingBox();
  ok(libro.width <= 360.5 && libro.height <= 580.5 && libro.width >= 300, `portada: el cuaderno mide ${Math.round(libro.width)}x${Math.round(libro.height)} (máximo 360x580)`);
  ok((await page.locator('.oc-anillas i').count()) === 11, 'portada: 11 anillas en el lado izquierdo');
  const tapa = page.locator('.oc-tapa');
  ok((await tapa.locator('img').count()) === 2 && (await tapa.locator('img').evaluateAll((els) => els.every((e) => e.complete && e.naturalWidth > 0))), 'portada: logo W con pin y "WhereGüense" cargan');
  ok((await tapa.locator('img[alt="WhereGüense"]').count()) === 1, 'portada: el nombre tiene texto alternativo');
  const txt = await tapa.innerText();
  ok(/República de/.test(txt) && /NICARAGUA/.test(txt) && /2026/.test(txt), 'portada: "República de NICARAGUA" y "2026"');
  const fondo = await tapa.evaluate((e) => getComputedStyle(e).backgroundImage);
  ok(fondo.includes('rgb(30, 42, 74)'), 'portada: fondo azul marino #1E2A4A');
  ok((await page.locator('.oc-libro').evaluate((e) => getComputedStyle(e).borderRadius)) === '20px' && (await page.locator('.oc-libro').evaluate((e) => getComputedStyle(e).boxShadow)) !== 'none', 'portada: bordes de 20px y sombra');
  ok((await page.locator('.oc-papel[inert]').count()) === 3, 'portada: las páginas interiores no se pueden tocar ni enfocar (inert)');
  await page.screenshot({ path: path.join(capturas, 'cuaderno_1_portada.png') });

  // ---------- abrir: página 1 ----------
  await page.mouse.click(195, 400);
  await espera(page);
  ok(!(await visible(page, '.oc-tapa')), 'abrir: al tocar la portada se voltea y desaparece');
  ok((await activa(page).count()) === 1 && (await activa(page).locator('.oc-titulo').textContent()) === 'Elige tu compañero de aventura', 'página 1: "Elige tu compañero de aventura"');
  ok((await activa(page).locator('.oc-pagina').textContent()) === '1 / 3', 'página 1: indicador "1 / 3" abajo a la derecha');
  const pg = await activa(page).locator('.oc-pagina').boundingBox();
  ok(pg.x > libro.x + libro.width / 2 && pg.y > libro.y + libro.height - 60, 'página 1: el indicador está en la esquina inferior derecha');
  ok((await activa(page).evaluate((e) => getComputedStyle(e).backgroundColor)) === 'rgb(245, 240, 232)', 'página 1: papel crema #F5F0E8');
  ok((await page.evaluate(() => document.activeElement.textContent)) === 'Elige tu compañero de aventura', 'página 1: el foco pasa al título al voltear');
  const nombres = await activa(page).locator('.oc-comp strong').allTextContents();
  ok(nombres.join(',') === 'Cabezón,Gigantona' && (await activa(page).locator('.oc-comp img').evaluateAll((els) => els.every((e) => e.complete && e.naturalWidth > 0))), 'página 1: Cabezón y Gigantona con su imagen');
  const continuar = activa(page).locator('.oc-boton');
  ok(await continuar.isDisabled(), 'página 1: "Continuar" está apagado sin elegir');
  await activa(page).locator('.oc-comp').nth(1).click();
  ok((await activa(page).locator('.oc-comp').nth(1).getAttribute('aria-checked')) === 'true' && (await activa(page).locator('.oc-comp').nth(0).getAttribute('aria-checked')) === 'false' && !(await continuar.isDisabled()), 'página 1: elegir la Gigantona la marca y activa "Continuar"');
  await page.screenshot({ path: path.join(capturas, 'cuaderno_2_companero.png') });

  // ---------- página 2: datos ----------
  await continuar.click();
  await espera(page);
  const p2 = activa(page);
  ok((await p2.locator('.oc-pagina').textContent()) === '2 / 3' && (await p2.locator('.oc-titulo-sello').textContent()) === 'Cuéntanos de ti', 'página 2: "Cuéntanos de ti" e indicador "2 / 3"');
  const etqs = (await p2.locator('.oc-campo > label, .oc-etq').allTextContents()).map((x) => x.replace(/\s+/g, ' ').trim());
  ok(etqs.slice(0, 4).join('|') === 'Nombre de usuario *|País de origen *|Idioma preferido *|Fecha de nacimiento *', `página 2: obligatorios con asterisco (${etqs.slice(0, 4).join('|')})`);
  ok(etqs.slice(4).join('|') === 'Teléfono|Género|Foto de perfil', `página 2: opcionales sin asterisco (${etqs.slice(4).join('|')})`);
  const paises = await p2.locator('#oc-pais option').allTextContents();
  ok(paises[0] === 'Nicaragua' && (await p2.locator('#oc-pais').inputValue()) === 'Nicaragua', 'página 2: Nicaragua primera y elegida por defecto');
  ok((await p2.locator('input[name="oc-idioma"]:checked').getAttribute('value')) === 'es' && (await p2.locator('input[name="oc-idioma"]').count()) === 2, 'página 2: idioma Español por defecto (y English)');
  ok((await p2.locator('#oc-nacimiento').getAttribute('type')) === 'date', 'página 2: la fecha es un selector de fecha');
  ok((await p2.locator('.oc-cod').inputValue()) === '+505', 'página 2: teléfono con prefijo +505');
  ok((await p2.locator('input[name="oc-genero"]').evaluateAll((els) => els.map((e) => e.value))).join(',') === 'masculino,femenino,prefiero_no_decir', 'página 2: género Masculino / Femenino / Prefiero no decir');
  const linea = await p2.locator('#oc-usuario').evaluate((e) => { const c = getComputedStyle(e); return { arriba: c.borderTopWidth, lados: c.borderLeftWidth, abajo: c.borderBottomWidth, fondo: c.backgroundColor }; });
  ok(linea.arriba === '0px' && linea.lados === '0px' && parseFloat(linea.abajo) >= 1 && linea.fondo === 'rgba(0, 0, 0, 0)', `página 2: los campos son solo una línea de abajo, sin caja (${JSON.stringify(linea)})`);
  ok(!(await visible(page, '.oc-foto-pegar input')), 'página 2: no hay botón nativo "Choose file"');

  // validaciones
  await p2.locator('.oc-boton--form').click();
  await page.waitForTimeout(150);
  const msgs = await p2.locator('.oc-msg').allTextContents();
  ok(msgs.includes('Escribe tu nombre de usuario.') && msgs.includes('Indica tu fecha de nacimiento.') && (await page.evaluate(() => window.__cuaderno.guardados.length)) === 0, 'validación: faltan nombre y fecha -> avisos y no guarda');
  await p2.locator('#oc-nacimiento').fill('2999-01-01');
  await p2.locator('#oc-nacimiento').evaluate((e) => { e.max = ''; });
  await p2.locator('#oc-usuario').fill('Ryky');
  await p2.locator('#oc-telefono').fill('123');
  await p2.locator('.oc-boton--form').click();
  await page.waitForTimeout(150);
  const msgs2 = await p2.locator('.oc-msg').allTextContents();
  ok(msgs2.includes('Revisa tu fecha de nacimiento.') && msgs2.includes('El teléfono debe tener entre 4 y 14 dígitos.'), 'validación: fecha futura y teléfono corto se rechazan');

  // foto
  await p2.locator('input[type=file]').setInputFiles({ name: 'nota.txt', mimeType: 'text/plain', buffer: Buffer.from('hola') });
  await page.waitForTimeout(150);
  ok((await p2.locator('.oc-msg').allTextContents()).includes('Usa una foto JPG, PNG o WebP.'), 'foto: un archivo que no es imagen se rechaza');
  await p2.locator('input[type=file]').setInputFiles({ name: 'yo.png', mimeType: 'image/png', buffer: PNG });
  await p2.locator('.oc-foto-marco img').waitFor();
  ok((await p2.locator('.oc-foto-pegar strong').textContent()) === 'Cambiar foto' && (await p2.locator('.oc-foto-marco img').getAttribute('src')).startsWith('data:image/jpeg'), 'foto: se ve la miniatura y el texto cambia a "Cambiar foto"');

  // datos completos
  await p2.locator('#oc-nacimiento').fill('2000-05-10');
  await p2.locator('#oc-pais').selectOption('Costa Rica');
  await p2.locator('input[name="oc-idioma"][value="en"]').check({ force: true });
  await p2.locator('.oc-cod').selectOption('+506');
  await p2.locator('#oc-telefono').fill('8888 8888');
  await p2.locator('input[name="oc-genero"][value="femenino"]').check({ force: true });
  await page.screenshot({ path: path.join(capturas, 'cuaderno_3_datos.png') });
  await p2.locator('.oc-boton--form').click();
  await espera(page);
  const g = await page.evaluate(() => window.__cuaderno.guardados[0]);
  ok(g && g.nombre === 'Ryky' && g.pais === 'Costa Rica' && g.idioma === 'en' && g.fechaNacimiento === '2000-05-10' && g.telefono === '+506 88888888' && g.genero === 'femenino' && g.foto.startsWith('data:image/jpeg'), `guardado: entrega nombre, país, idioma, fecha, teléfono con prefijo, género y foto (${JSON.stringify({ ...g, foto: g?.foto?.slice(0, 15) })})`);

  // ---------- página 3: bienvenida ----------
  const p3 = activa(page);
  ok((await p3.locator('.oc-pagina').textContent()) === '3 / 3' && (await p3.locator('.oc-sello-txt').textContent()) === 'Bienvenido', 'página 3: sello "BIENVENIDO" e indicador "3 / 3"');
  const giro = await p3.locator('.oc-sello-grande').evaluate((e) => getComputedStyle(e).transform);
  const m = giro.match(/matrix\(([-\d.e]+), ([-\d.e]+)/);
  ok(m && Math.round(Math.atan2(Number(m[2]), Number(m[1])) * 180 / Math.PI) === -14, `página 3: el sello está rotado (${giro})`);
  await page.screenshot({ path: path.join(capturas, 'cuaderno_4_bienvenida.png') });
  ok((await p3.locator('.oc-boton').textContent()) === 'Comenzar mi aventura', 'página 3: botón "Comenzar mi aventura"');
  await p3.locator('.oc-boton').click();
  ok(JSON.stringify(await page.evaluate(() => window.__cuaderno.terminados)) === '["gigantona"]', 'página 3: "Comenzar" entrega el compañero elegido (gigantona)');

  // volver atrás conserva todo
  await p3.locator('.oc-atras').click();
  await espera(page, 1200);
  ok((await activa(page).locator('.oc-pagina').textContent()) === '2 / 3' && (await activa(page).locator('#oc-usuario').inputValue()) === 'Ryky' && (await activa(page).locator('#oc-telefono').inputValue()) === '8888 8888', 'atrás: vuelve a la página 2 con los datos escritos');
  await activa(page).locator('.oc-atras').click();
  await espera(page, 1200);
  ok((await activa(page).locator('.oc-comp').nth(1).getAttribute('aria-checked')) === 'true', 'atrás: en la página 1 sigue elegida la Gigantona');
  await activa(page).locator('.oc-atras').click();
  await espera(page, 1200);
  ok(await visible(page, '.oc-tapa') && (await page.locator('.oc-papel[inert]').count()) === 3, 'atrás: de vuelta en la portada');
  ok(errores.length === 0, `sin errores de página (${errores.join('; ')})`);
  await ctx.close();
}

// ---------- campos opcionales vacíos y país con valor previo ----------
{
  const { ctx, page } = await abrir('&previo=1');
  ok((await page.locator('.oc-salir').count()) === 1, 'portada: enlace "Volver al inicio" fuera del cuaderno');
  await page.locator('.oc-tapa').click(); await espera(page);
  await activa(page).locator('.oc-comp').nth(0).click();
  await activa(page).locator('.oc-boton').click(); await espera(page);
  const p2 = activa(page);
  ok((await p2.locator('#oc-usuario').inputValue()) === 'Ryky' && (await p2.locator('#oc-pais').inputValue()) === 'Honduras' && (await p2.locator('input[name="oc-idioma"]:checked').getAttribute('value')) === 'en', 'con datos previos: nombre, país e idioma llegan escritos');
  await p2.locator('#oc-nacimiento').fill('1995-03-02');
  await p2.locator('.oc-boton--form').click(); await espera(page, 600);
  const g = await page.evaluate(() => window.__cuaderno.guardados[0]);
  ok(g && g.telefono === null && g.genero === null && g.foto === null && g.fechaNacimiento === '1995-03-02', 'opcionales vacíos: teléfono, género y foto salen como null');
  await ctx.close();
}

// ---------- error al guardar (nombre repetido) ----------
{
  const { ctx, page } = await abrir('&repetido=1');
  await page.locator('.oc-tapa').click(); await espera(page);
  await activa(page).locator('.oc-comp').nth(0).click();
  await activa(page).locator('.oc-boton').click(); await espera(page);
  const p2 = activa(page);
  await p2.locator('#oc-usuario').fill('Ryky');
  await p2.locator('#oc-nacimiento').fill('2001-01-01');
  await p2.locator('.oc-boton--form').click();
  await page.waitForTimeout(500);
  ok((await p2.locator('.oc-error').textContent()) === 'Ese nombre de usuario ya está en uso. Elige otro.' && (await p2.locator('.oc-pagina').textContent()) === '2 / 3' && (await p2.locator('.oc-boton--form').textContent()) === 'Sellar mis datos →', 'error al guardar: el aviso sale en la página y no avanza');
  await p2.locator('#oc-usuario').fill('Ryky2');
  await p2.locator('.oc-boton--form').click(); await espera(page);
  ok((await activa(page).locator('.oc-pagina').textContent()) === '3 / 3', 'error al guardar: al corregirlo avanza a la bienvenida');
  await ctx.close();
}

// ---------- pantalla baja ----------
{
  const { ctx, page } = await abrir('', { ancho: 360, alto: 560 });
  const libro = await page.locator('.oc-libro').boundingBox();
  ok(libro.y >= 0 && libro.y + libro.height <= 560, `pantalla de 360x560: el cuaderno cabe (${Math.round(libro.height)} px de alto)`);
  await page.locator('.oc-tapa').click(); await espera(page);
  await activa(page).locator('.oc-comp').nth(0).click();
  ok((await activa(page).locator('.oc-boton').boundingBox()).y + 44 <= 560, 'pantalla baja: "Continuar" queda a la vista');
  await ctx.close();
}

await browser.close();
await servidor.close();
console.log(`\n${total - fallas.length}/${total} comprobaciones`);
if (fallas.length) { console.log('FALLAS:\n' + fallas.join('\n')); process.exit(1); }
