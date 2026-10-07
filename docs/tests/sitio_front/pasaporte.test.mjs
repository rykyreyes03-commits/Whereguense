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
// PNG de 1x1 para subir como foto
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
const servidor = await createServer({ configFile: path.join(aqui, 'vite.config.mjs') });
await servidor.listen();
const base = 'http://localhost:5198/';
const capturas = process.env.CAPTURAS || path.join(os.homedir(), 'Downloads');
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const BD = {
  uid: 'yo', sesion: true, llamadas: [], fotos: [], resenas: [],
  nivel: { nivel_actual: 3, puntos_actuales: 0.5, puntos_para_siguiente: 6, porcentaje: 8, puntos_totales: 6.5 }, sitioFila: [],
};
async function abrir(query, { ancho = 390, alto = 800, local = null, esperar = '.mis-sellos-pasaporte' } = {}) {
  const ctx = await browser.newContext({ viewport: { width: ancho, height: alto }, locale: 'en-US', deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  const errores = [];
  page.on('pageerror', (e) => errores.push(e.message));
  await page.addInitScript(([bd, loc]) => {
    window.__db = bd;
    if (loc) for (const [k, v] of Object.entries(loc)) localStorage.setItem(k, v);
  }, [BD, local]);
  await page.goto(`${base}?${query}&lang=es`);
  await page.waitForSelector(esperar);
  await page.waitForTimeout(300);
  return { ctx, page, errores };
}
const abrirDoc = async (page) => { await page.click('.mis-sellos-pasaporte'); await page.waitForSelector('.pasaporte-doc'); await page.locator('.pasaporte-tapa').waitFor({ state: 'detached', timeout: 6000 }); await page.waitForTimeout(200); };
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
  ok((await txt(page, '.pasaporte-nombre')) === 'Ryky', `${t} nombre de usuario`);
  ok((await txt(page, '.pasaporte-pais')).trim() === 'Nicaragua' && (await page.locator('.pasaporte-pais svg').count()) === 1, `${t} nacionalidad: Nicaragua con su bandera`);
  ok((await txt(page, '.pasaporte-dato--nivel')).includes('Nivel: 3') && (await txt(page, '.pasaporte-dato--sellos')).includes('Sellos: 3 de 89'), `${t} nivel y "Sellos: 3 de 89"`);
  ok((await txt(page, '.pasaporte-dato--ruta')).includes('Ruta: Ruta Dariana'), `${t} ruta favorita: Ruta Dariana`);
  ok((await page.locator('text=/Apellidos|Títulos|Sexo/').count()) === 0, `${t} sin Apellidos, Títulos ni Sexo`);
  const nb = await page.locator('.pasaporte-numero').boundingBox();
  const cx = (nb.x + nb.width / 2 - d.x) / d.width, cy = (nb.y + nb.height / 2 - d.y) / d.height;
  ok(Math.abs(cx - 1341 / 1504) < 0.01 && Math.abs(cy - 118 / 1680) < 0.01, `${t} el número tapa exactamente el "##" impreso`);
  const foto = page.locator('.pasaporte-foto img');
  ok((await foto.getAttribute('src')).includes('cabezon') && !(await foto.getAttribute('class')).includes('perfil'), `${t} la foto es el personaje elegido (cabezón)`);

  // ---- los sellos
  ok((await page.locator('.pasaporte-sello:not(.pasaporte-sello--vacio)').count()) === 3, `${t} 3 sellos de sitio (el de QR de negocio no va)`);
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
  ok((await page.locator('.pasaporte-sello--vacio .pasaporte-candado').count()) === 3 && (await page.locator('.pasaporte-sello').count()) === 6, `${t} los 3 círculos vacíos muestran un candado gris`);
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
  ok((await page.locator('.pasaporte-sello:not(.pasaporte-sello--vacio)').count()) === 6, 'con 9 sellos se dibujan solo 6 círculos');
  ok((await txt(page, '.pasaporte-mas')) === '+3 más', 'y un "+3 más" abajo con los que faltan');
  ok((await txt(page, '.pasaporte-dato--sellos')).includes('9 de 89'), 'el contador dice 9 de 89');
  const ordenados = await page.locator('.pasaporte-sello').evaluateAll((els) => els.map((e) => ({ x: e.getBoundingClientRect().left, y: e.getBoundingClientRect().top })));
  ok(ordenados.length === 6 && ordenados[0].y === ordenados[2].y && ordenados[3].y > ordenados[0].y && ordenados[1].x > ordenados[0].x && ordenados[2].x > ordenados[1].x && ordenados[3].x === ordenados[0].x, 'los círculos se llenan en orden: 3 por fila, de izquierda a derecha y de arriba abajo');
  await page.screenshot({ path: path.join(capturas, 'pasaporte_visual_muchos.png') });
  await ctx.close();
}

// ---- sin sellos
{
  const { ctx, page } = await abrir('vista=pasaporte&sinsellos=1');
  await abrirDoc(page);
  ok((await txt(page, '.pasaporte-dato--sellos')).includes('0 de 89') && (await txt(page, '.pasaporte-dato--ruta')).includes('Sin ruta aún'), 'sin sellos: 0 de 89 y "Sin ruta aún"');
  ok((await page.locator('.pasaporte-candado').count()) === 6 && (await page.locator('.pasaporte-mas').count()) === 0, 'sin sellos: los 6 círculos llevan candado');
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
  ok((await txt(page, '.pasaporte-numero')) === '#------' && (await txt(page, '.pasaporte-nombre')) === 'Invitado', 'invitado: "#------" y nombre "Invitado"');
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


// ---------- portada que se abre ----------
{
  const { ctx, page } = await abrir('vista=pasaporte');
  await page.click('.mis-sellos-pasaporte');
  await page.waitForSelector('.pasaporte-tapa');
  const t0 = Date.now();
  ok((await page.locator('.pasaporte-tapa img').count()) === 2 && /NICARAGUA/.test(await txt(page, '.pasaporte-tapa')) && /2026/.test(await txt(page, '.pasaporte-tapa')), 'portada: el cuaderno azul con la W, "WhereGüense", NICARAGUA y 2026');
  ok((await page.locator('.pasaporte-tapa').evaluate((e) => getComputedStyle(e).backgroundImage)).includes('rgb(30, 42, 74)'), 'portada: azul marino #1E2A4A');
  ok((await page.locator('.pasaporte-interior').getAttribute('inert')) !== null && (await page.locator('.pasaporte-editar').count()) === 0, 'portada: el interior no se puede tocar y todavía no hay lápiz');
  await page.screenshot({ path: path.join(capturas, 'pasaporte_portada.png') });
  await page.waitForTimeout(Math.max(0, 600 - (Date.now() - t0)));
  ok(!(await page.locator('.pasaporte-tapa').getAttribute('class')).includes('oc-volteada'), 'portada: a los 0,6 s sigue cerrada');
  await page.waitForTimeout(1000);
  const clase = await page.locator('.pasaporte-tapa').getAttribute('class').catch(() => 'oc-volteada');
  ok(clase.includes('oc-volteada') || (await page.locator('.pasaporte-tapa').count()) === 0, 'portada: pasado 1 s se abre (animación)');
  await page.screenshot({ path: path.join(capturas, 'pasaporte_abriendo.png') });
  await page.locator('.pasaporte-tapa').waitFor({ state: 'detached', timeout: 4000 });
  ok((await page.locator('.pasaporte-interior').getAttribute('inert')) === null && (await page.locator('.pasaporte-editar').count()) === 1, 'portada: al abrirse queda el interior activo y aparece el lápiz');
  await ctx.close();
}
{
  const { ctx, page } = await abrir('vista=pasaporte');
  await page.click('.mis-sellos-pasaporte');
  await page.waitForSelector('.pasaporte-tapa');
  await page.click('.pasaporte-tapa');
  await page.locator('.pasaporte-tapa').waitFor({ state: 'detached', timeout: 3000 });
  ok(true, 'portada: tocarla la abre sin esperar el segundo');
  await ctx.close();
}

// ---------- datos del usuario en el interior ----------
{
  const { ctx, page } = await abrir('vista=pasaporte');
  await abrirDoc(page);
  ok((await txt(page, '.pasaporte-personal')) === 'Nac. 10 may 2000 · Tel. +505 88888888 · Femenino', `datos: nacimiento, teléfono y género (${await txt(page, '.pasaporte-personal')})`);
  const p = await page.locator('.pasaporte-personal').boundingBox();
  const f = await page.locator('.pasaporte-foto').boundingBox();
  const s0 = await page.locator('.pasaporte-sello--0').boundingBox();
  ok(p.y >= f.y + f.height - 1 && p.y + p.height <= s0.y + 1, 'datos: la línea queda entre la foto y los sellos');
  await page.screenshot({ path: path.join(capturas, 'pasaporte_datos.png') });
  await ctx.close();
}
{
  const { ctx, page } = await abrir('vista=pasaporte&sindatos=1&pais=Honduras');
  await abrirDoc(page);
  ok((await page.locator('.pasaporte-personal').count()) === 0, 'datos: sin nacimiento, teléfono ni género no se dibuja la línea');
  ok((await txt(page, '.pasaporte-pais')).trim() === 'Honduras' && (await page.locator('.pasaporte-pais svg').count()) === 0, 'datos: el país es el del usuario (Honduras, sin la bandera de Nicaragua)');
  await ctx.close();
}
{
  const { ctx, page } = await abrir('vista=pasaporte&invitado=1');
  await abrirDoc(page);
  ok((await page.locator('.pasaporte-editar').count()) === 0, 'invitado: no hay lápiz para editar');
  await ctx.close();
}

// ---------- editar la información ----------
{
  const { ctx, page } = await abrir('vista=pasaporte');
  await abrirDoc(page);
  const lapiz = page.locator('.pasaporte-editar');
  const lb = await lapiz.boundingBox();
  const cb = await page.locator('.pasaporte-cerrar').boundingBox();
  ok(lb.width >= 44 && lb.height >= 44 && lb.y < 70 && lb.x + lb.width <= cb.x + 1 && (await lapiz.getAttribute('aria-label')) === 'Editar información', 'editar: lápiz de 44 px arriba a la derecha, junto a la X');
  await lapiz.click();
  await page.waitForSelector('.pasaporte-edicion');
  const ed = page.locator('.pasaporte-edicion');
  ok((await ed.locator('.oc-titulo-sello').textContent()) === 'Editar información', 'editar: abre el formulario "Editar información"');
  ok((await ed.locator('#ed-usuario').inputValue()) === 'Ryky' && (await ed.locator('#ed-pais').inputValue()) === 'Nicaragua' && (await ed.locator('input[name="ed-idioma"]:checked').getAttribute('value')) === 'es' && (await ed.locator('#ed-nacimiento').inputValue()) === '2000-05-10' && (await ed.locator('.oc-cod').inputValue()) === '+505' && (await ed.locator('#ed-telefono').inputValue()) === '88888888' && (await ed.locator('input[name="ed-genero"]:checked').getAttribute('value')) === 'femenino', 'editar: los campos llegan con los datos actuales');
  ok((await ed.locator('.oc-foto-marco img').getAttribute('src')).includes('cabezon'), 'editar: sin foto propia, el marco muestra el personaje elegido');
  ok((await ed.locator('.oc-foto-pegar').boundingBox()).height >= 44, 'editar: la foto se puede tocar (zona de al menos 44 px)');
  await page.screenshot({ path: path.join(capturas, 'pasaporte_editar.png') });

  // validación: nombre vacío no guarda; la fecha ya no es obligatoria
  await ed.locator('#ed-usuario').fill('');
  await ed.locator('#ed-nacimiento').fill('');
  await ed.locator('.oc-boton--form').click();
  ok((await ed.locator('.oc-msg').allTextContents()).join('|') === 'Escribe tu nombre de usuario.' && (await page.evaluate(() => (window.__guardados || []).length)) === 0, 'editar: sin nombre no guarda (y la fecha vacía no se reclama)');

  // cambiar todo, quitar lo opcional y cambiar la foto
  await ed.locator('#ed-usuario').fill('Ryky Viajero');
  await ed.locator('#ed-pais').selectOption('Costa Rica');
  await ed.locator('input[name="ed-idioma"][value="en"]').check({ force: true });
  await ed.locator('#ed-telefono').fill('');
  await ed.locator('input[name="ed-genero"][value="femenino"]').click({ force: true });
  ok((await ed.locator('input[name="ed-genero"]:checked').count()) === 0, 'editar: tocar de nuevo el género elegido lo deja vacío');
  await ed.locator('input[type=file]').setInputFiles({ name: 'yo.png', mimeType: 'image/png', buffer: PNG });
  await ed.locator('.oc-foto-marco img[src^="data:image/jpeg"]').waitFor();
  ok((await ed.locator('.oc-foto-pegar strong').textContent()) === 'Cambiar foto', 'editar: al tocar la foto se elige otra y se ve la vista previa');
  await ed.locator('.oc-boton--form').click();
  await page.waitForSelector('.pasaporte-edicion', { state: 'detached' });
  const g = (await page.evaluate(() => window.__guardados)).at(-1);
  ok(g.nombre === 'Ryky Viajero' && g.pais === 'Costa Rica' && g.idioma === 'en' && g.fechaNacimiento === null && g.telefono === null && g.genero === null && g.foto.startsWith('data:image/jpeg'), `editar: guarda los cambios y los opcionales vacíos salen null (${JSON.stringify({ ...g, foto: g.foto?.slice(0, 15) })})`);
  ok((await txt(page, '.pasaporte-nombre')) === 'Ryky Viajero' && (await txt(page, '.pasaporte-pais')).trim() === 'Costa Rica' && (await page.locator('.pasaporte-personal').count()) === 0, 'editar: al guardar vuelve al pasaporte con los datos nuevos');
  const img = page.locator('.pasaporte-foto img');
  ok((await img.getAttribute('src')).startsWith('data:image/jpeg') && (await img.getAttribute('class')).includes('perfil'), 'editar: la foto nueva sale en el pasaporte');
  await page.screenshot({ path: path.join(capturas, 'pasaporte_editado.png') });
  await ctx.close();
}
{
  const { ctx, page } = await abrir('vista=pasaporte&fallo=1');
  await abrirDoc(page);
  await page.click('.pasaporte-editar');
  await page.waitForSelector('.pasaporte-edicion');
  await page.fill('#ed-usuario', 'Otro nombre');
  await page.click('.pasaporte-edicion .oc-boton--form');
  await page.waitForTimeout(400);
  ok((await txt(page, '.pasaporte-edicion .oc-error')) === 'No se pudo guardar tu información. Intenta de nuevo.' && (await page.locator('.pasaporte-edicion').count()) === 1, 'editar: si falla el guardado, el aviso sale en el formulario');
  ok((await page.inputValue('#ed-usuario')) === 'Otro nombre', 'editar: lo escrito se conserva tras el error');
  await page.click('.pasaporte-edicion-cancelar');
  await page.waitForSelector('.pasaporte-edicion', { state: 'detached' });
  ok((await txt(page, '.pasaporte-nombre')) === 'Ryky', 'editar: Cancelar vuelve al pasaporte sin cambios');
  await ctx.close();
}
{
  const { ctx, page } = await abrir('vista=pasaporte&gigantona=1');
  await abrirDoc(page);
  await page.click('.pasaporte-editar');
  await page.waitForSelector('.pasaporte-edicion');
  ok((await page.locator('.pasaporte-edicion .oc-foto-marco img').getAttribute('src')).includes('gigantona'), 'editar: con la gigantona elegida, el marco muestra a la gigantona');
  await page.keyboard.press('Escape');
  ok((await page.locator('.pasaporte-doc, .pasaporte-edicion').count()) === 0, 'editar: Escape cierra todo el pasaporte');
  await ctx.close();
}
{
  // "Mi pasaporte" en el Perfil
  const { ctx, page } = await abrir('vista=perfil', { esperar: '.perfil-acciones' });
  await page.getByRole('button', { name: 'Mi pasaporte' }).click();
  ok(JSON.stringify(await page.evaluate(() => window.__eventos)) === '[["ir","pasaporteVisual"]]', 'perfil: el botón "Mi pasaporte" abre el pasaporte visual');
  await ctx.close();
}
{
  // se abre directo desde el perfil
  const { ctx, page } = await abrir('vista=pasaporte&abrir=1');
  await page.waitForSelector('.pasaporte-tapa');
  await page.locator('.pasaporte-tapa').waitFor({ state: 'detached', timeout: 5000 });
  ok((await page.locator('.pasaporte-doc').count()) === 1, 'perfil: llegando desde el perfil el pasaporte se abre solo (portada y luego interior)');
  await ctx.close();
}

await browser.close();
await servidor.close();
console.log(`\n${total - fallas.length}/${total} comprobaciones`);
if (fallas.length) { console.log('FALLAS:\n' + fallas.join('\n')); process.exit(1); }
