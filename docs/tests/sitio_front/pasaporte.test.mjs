// Pruebas del pasaporte de viajero (PasaporteVisual): cuaderno con anillas, portada que se abre al tocarla, página de datos del
// viajero, página de sellos y edición de la información.
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
async function abrir(query, { ancho = 390, alto = 800, local = null, esperar = '.mis-sellos-pasaporte', lang = 'es' } = {}) {
  const ctx = await browser.newContext({ viewport: { width: ancho, height: alto }, locale: 'en-US', deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  const errores = [];
  page.on('pageerror', (e) => errores.push(e.message));
  await page.addInitScript(([bd, loc]) => {
    window.__db = bd;
    if (loc) for (const [k, v] of Object.entries(loc)) localStorage.setItem(k, v);
  }, [BD, local]);
  await page.goto(`${base}?${query}&lang=${lang}`);
  await page.waitForSelector(esperar);
  await page.waitForTimeout(300);
  return { ctx, page, errores };
}
// Abre el pasaporte y toca la portada para abrir el cuaderno
const abrirDoc = async (page) => {
  await page.click('.mis-sellos-pasaporte');
  await page.waitForSelector('.pasaporte-libro');
  await page.waitForTimeout(450);
  await page.click('.oc-tapa');
  await page.waitForTimeout(1300);
};
const activa = (page) => page.locator('.oc-hoja:not([inert])');
const txt = (page, sel) => page.locator(sel).first().textContent();

for (const ancho of [360, 412]) {
  const t = `[${ancho}px]`;
  const { ctx, page, errores } = await abrir('vista=pasaporte', { ancho });

  // ---- la tarjeta que abre el pasaporte
  const tarjeta = page.locator('.mis-sellos-pasaporte');
  ok((await tarjeta.locator('strong').textContent()) === 'Mi pasaporte' && (await tarjeta.locator('small').textContent()) === 'Ver tu pasaporte de viajero', `${t} la tarjeta dice "Mi pasaporte" / "Ver tu pasaporte de viajero"`);
  ok((await page.locator('text=Mis cupones').count()) === 0, `${t} "Mis cupones" ya no está en el pasaporte`);

  // ---- portada
  await tarjeta.click();
  await page.waitForSelector('.pasaporte-libro');
  await page.waitForTimeout(450);
  const libro = page.locator('.pasaporte-libro');
  const d = await libro.boundingBox();
  ok(d.width <= 360.5 && d.height <= 580.5 && d.x >= 0 && d.x + d.width <= ancho && d.y >= 0 && d.y + d.height <= 800, `${t} el cuaderno cabe en pantalla (${Math.round(d.width)}x${Math.round(d.height)}, máximo 360x580)`);
  ok((await libro.getAttribute('role')) === 'dialog' && (await libro.getAttribute('aria-label')) === 'Pasaporte de Ryky', `${t} es un diálogo accesible ("Pasaporte de Ryky")`);
  ok((await page.locator('.pasaporte-libro .oc-anillas i').count()) === 11, `${t} 11 anillas en el lado izquierdo`);
  const fondo = await page.locator('.pasaporte-fondo').evaluate((e) => getComputedStyle(e).backgroundColor);
  ok(fondo === 'rgb(43, 46, 54)', `${t} fondo oscuro con textura (${fondo})`);
  const tapa = page.locator('.oc-tapa');
  const tt = await tapa.innerText();
  ok(/República de/.test(tt) && /NICARAGUA/.test(tt) && /2026/.test(tt) && (await tapa.locator('img').count()) === 2, `${t} portada: W con pin, WhereGüense, República de NICARAGUA y 2026`);
  ok((await tapa.evaluate((e) => getComputedStyle(e).backgroundImage)).includes('rgb(30, 42, 74)'), `${t} portada: azul marino #1E2A4A`);
  ok((await page.locator('.oc-papel[inert]').count()) === 2, `${t} las páginas interiores no se pueden tocar mientras está cerrado`);
  await page.waitForTimeout(1500);
  ok((await tapa.count()) === 1 && !((await tapa.getAttribute('class')).includes('oc-volteada')), `${t} la portada NO se abre sola: espera el primer toque`);
  await page.screenshot({ path: path.join(capturas, `pasaporte_cuaderno_portada_${ancho}.png`) });

  // ---- abrir con el primer toque
  await tapa.click();
  await page.waitForTimeout(300);
  ok((await tapa.getAttribute('class')).includes('oc-volteada'), `${t} al tocar la portada empieza la animación de abrir`);
  await page.waitForTimeout(1100);
  ok((await activa(page).count()) === 1 && (await activa(page).evaluate((e) => getComputedStyle(e).backgroundColor)) === 'rgb(245, 240, 232)', `${t} se ve la página de datos, papel crema #F5F0E8`);
  ok((await page.evaluate(() => document.activeElement.textContent)) === 'Ryky', `${t} el foco pasa al nombre al abrir`);

  // ---- página de datos
  const p1 = activa(page);
  const foto = await p1.locator('.pv-foto').boundingBox();
  ok(Math.round(foto.width) === 80 && Math.round(foto.height) === 80 && (await p1.locator('.pv-foto').evaluate((e) => getComputedStyle(e).borderRadius)) === '50%', `${t} foto circular de 80 px`);
  ok((await p1.locator('.pv-foto-img').getAttribute('src')).includes('cabezon') && !(await p1.locator('.pv-foto-img').getAttribute('class')).includes('perfil'), `${t} sin foto propia: el personaje elegido (cabezón)`);
  ok((await txt(page, '.pv-nombre')) === 'Ryky' && Number(await p1.locator('.pv-nombre').evaluate((e) => getComputedStyle(e).fontWeight)) >= 700, `${t} nombre de usuario en negrita`);
  ok((await txt(page, '.pv-pais')) === 'Nicaragua', `${t} país de origen`);
  ok((await txt(page, '.pv-numero')).toLowerCase() === '#3f9a1c', `${t} número de pasaporte`);
  const fila = (clave) => p1.locator(`.pv-fila--${clave} dd`).textContent();
  ok((await fila('nacimiento')) === '10 may 2000', `${t} 🗓️ fecha de nacimiento (${await fila('nacimiento')})`);
  ok((await fila('telefono')) === '+505 88888888', `${t} 📱 teléfono`);
  ok((await fila('idioma')) === 'Español', `${t} 🌍 idioma preferido`);
  ok((await fila('genero')) === 'Femenino', `${t} ⚥ género`);
  ok((await fila('nivel')) === '3' && (await fila('sellos')) === '3 de 89' && (await fila('ruta')) === 'Ruta Dariana', `${t} estadísticas: nivel 3, sellos 3 de 89, ruta favorita Ruta Dariana`);
  const lineas = await p1.locator('.pv-fila').evaluateAll((els) => els.map((e) => getComputedStyle(e).borderBottomStyle));
  ok(lineas.length === 7 && lineas.every((s) => s === 'dashed'), `${t} las filas son renglones de papel (7 con línea inferior)`);
  ok((await p1.locator('.oc-pagina').textContent()) === '1 / 2', `${t} indicador "1 / 2"`);
  ok((await p1.locator('.pv-sello').count()) === 0, `${t} los sellos no están en la página de datos`);
  const lapiz = p1.locator('.pasaporte-editar');
  const lb = await lapiz.boundingBox();
  ok(lb.width >= 44 && lb.height >= 44 && lb.x + lb.width <= d.x + d.width && lb.x > d.x + d.width / 2 && lb.y < d.y + 80 && (await lapiz.getAttribute('aria-label')) === 'Editar información', `${t} lápiz (Edit2) de 44 px arriba a la derecha de la página`);
  await page.screenshot({ path: path.join(capturas, `pasaporte_cuaderno_datos_${ancho}.png`) });

  // ---- página de sellos
  await p1.locator('.pv-siguiente').click();
  await page.waitForTimeout(1300);
  const p2 = activa(page);
  ok((await p2.locator('.oc-pagina').textContent()) === '2 / 2' && (await p2.locator('.oc-titulo-sello').textContent()) === 'Tus sellos', `${t} página de sellos ("2 / 2")`);
  ok((await p2.locator('.pv-sello:not(.pv-sello--vacio)').count()) === 3 && (await p2.locator('.pv-sello--vacio .pv-candado').count()) === 3, `${t} 3 sellos obtenidos (el de QR de negocio no va) y 3 candados`);
  ok((await p2.locator('.pv-sello-insignia').evaluateAll((els) => els.every((e) => e.complete && e.naturalWidth > 0))) && (await p2.locator('.pv-sello-marca > span').allTextContents()).every((m) => m === 'Sellado'), `${t} cada sello lleva su insignia y la marca "SELLADO"`);
  const estilo = await p2.locator('.pv-sello-marca').first().evaluate((e) => { const c = getComputedStyle(e); return { color: c.color, giro: c.transform }; });
  const m = estilo.giro.match(/matrix\(([-\d.e]+), ([-\d.e]+)/);
  ok(estilo.color === 'rgb(198, 40, 40)' && m && Math.round(Math.atan2(Number(m[2]), Number(m[1])) * 180 / Math.PI) === -15, `${t} marca roja rotada -15°`);
  ok((await p2.locator('.pv-mas').count()) === 0, `${t} con 3 sellos no hay "+N más"`);
  await page.screenshot({ path: path.join(capturas, `pasaporte_cuaderno_sellos_${ancho}.png`) });
  await p2.locator('.oc-atras').click();
  await page.waitForTimeout(1200);
  ok((await activa(page).locator('.oc-pagina').textContent()) === '1 / 2', `${t} "← Datos" vuelve a la página de datos`);
  await activa(page).locator('.oc-atras').click();
  await page.waitForTimeout(1200);
  ok((await page.locator('.oc-tapa').isVisible()) && (await page.locator('.oc-papel[inert]').count()) === 2, `${t} "← Portada" vuelve a cerrar el cuaderno`);

  // ---- cerrar
  const x = page.locator('.pasaporte-cerrar');
  const xc = await x.boundingBox();
  ok(xc.width >= 44 && xc.height >= 44 && xc.x + xc.width > ancho - 60 && xc.y < 70, `${t} el botón X está arriba a la derecha y mide al menos 44 px`);
  await x.click();
  ok((await page.locator('.pasaporte-libro').count()) === 0, `${t} la X cierra el pasaporte`);
  ok((await page.evaluate(() => document.activeElement.className)).includes('mis-sellos-pasaporte'), `${t} el foco vuelve a la tarjeta`);
  await tarjeta.click(); await page.waitForSelector('.pasaporte-libro');
  await page.keyboard.press('Escape');
  ok((await page.locator('.pasaporte-libro').count()) === 0, `${t} Escape cierra el pasaporte`);
  await tarjeta.click(); await page.waitForSelector('.pasaporte-libro'); await page.waitForTimeout(450);
  await page.mouse.click(5, 790);
  ok((await page.locator('.pasaporte-libro').count()) === 0, `${t} tocar fuera cierra el pasaporte`);
  ok(errores.length === 0, `${t} sin errores de página (${errores.join('; ')})`);
  await ctx.close();
}

// ---- más de 6 sellos
{
  const { ctx, page } = await abrir('vista=pasaporte&muchos=1');
  await abrirDoc(page);
  ok((await txt(page, '.pv-fila--sellos dd')) === '9 de 89', 'con 9 sellos el contador dice 9 de 89');
  await activa(page).locator('.pv-siguiente').click();
  await page.waitForTimeout(1300);
  ok((await activa(page).locator('.pv-sello:not(.pv-sello--vacio)').count()) === 6, 'con 9 sellos se dibujan solo 6 círculos');
  ok((await txt(page, '.pv-mas')) === '+3 más', 'y un "+3 más" abajo con los que faltan');
  await page.screenshot({ path: path.join(capturas, 'pasaporte_cuaderno_muchos.png') });
  await ctx.close();
}

// ---- sin sellos
{
  const { ctx, page } = await abrir('vista=pasaporte&sinsellos=1');
  await abrirDoc(page);
  ok((await txt(page, '.pv-fila--sellos dd')) === '0 de 89' && (await txt(page, '.pv-fila--ruta dd')) === 'Sin ruta aún', 'sin sellos: 0 de 89 y "Sin ruta aún"');
  await activa(page).locator('.pv-siguiente').click();
  await page.waitForTimeout(1300);
  ok((await activa(page).locator('.pv-candado').count()) === 6 && (await activa(page).locator('.pv-mas').count()) === 0, 'sin sellos: los 6 círculos llevan candado');
  await ctx.close();
}

// ---- datos que faltan
{
  const { ctx, page } = await abrir('vista=pasaporte&sindatos=1&pais=Honduras');
  await abrirDoc(page);
  const vacios = await Promise.all(['nacimiento', 'telefono', 'genero'].map((c) => activa(page).locator(`.pv-fila--${c} dd`).textContent()));
  ok(vacios.every((v) => v === '—') && (await txt(page, '.pv-fila--idioma dd')) === 'Español', 'sin datos opcionales: se ve "—" en nacimiento, teléfono y género; el idioma sigue');
  ok((await txt(page, '.pv-pais')) === 'Honduras', 'el país es el del usuario (Honduras)');
  await ctx.close();
}

// ---- personaje y foto
{
  const { ctx, page } = await abrir('vista=pasaporte&gigantona=1');
  await abrirDoc(page);
  ok((await activa(page).locator('.pv-foto-img').getAttribute('src')).includes('gigantona'), 'si eligió la gigantona, es la que sale en la foto');
  await ctx.close();
}
{
  const foto = 'data:image/svg+xml;utf8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2260%22 height=%2260%22%3E%3Crect width=%2260%22 height=%2260%22 fill=%22%23c33%22/%3E%3C/svg%3E';
  const { ctx, page } = await abrir('vista=pasaporte', { local: { fotoPerfil: foto } });
  await abrirDoc(page);
  const img = activa(page).locator('.pv-foto-img');
  ok((await img.getAttribute('src')) === foto && (await img.getAttribute('class')).includes('perfil'), 'si subió una foto de perfil, esa sale en lugar del personaje');
  await ctx.close();
}
{
  const { ctx, page } = await abrir('vista=pasaporte&invitado=1');
  await abrirDoc(page);
  ok((await txt(page, '.pv-nombre')) === 'Invitado' && (await txt(page, '.pv-numero')) === '#------' && (await txt(page, '.pv-pais')) === '—', 'invitado: nombre "Invitado", "#------" y país "—"');
  ok((await page.locator('.pasaporte-editar').count()) === 0, 'invitado: no hay lápiz para editar');
  await ctx.close();
}

// ---- en inglés
{
  const { ctx, page } = await abrir('vista=pasaporte', { lang: 'en' });
  ok((await page.locator('.mis-sellos-pasaporte strong').textContent()) === 'My passport', 'en: la tarjeta dice "My passport"');
  await page.click('.mis-sellos-pasaporte');
  await page.waitForSelector('.pasaporte-libro');
  ok((await txt(page, '.oc-tapa-toca')) === 'TAP TO OPEN' && (await page.locator('.pasaporte-cerrar').getAttribute('aria-label')) === 'Close passport', 'en: "TAP TO OPEN" y botón "Close passport"');
  await page.waitForTimeout(450);
  await page.click('.oc-tapa'); await page.waitForTimeout(1300);
  ok((await txt(page, '.pv-fila--nacimiento dd')) === 'May 10, 2000' && (await txt(page, '.pv-fila--genero dd')) === 'Female' && (await txt(page, '.pv-fila--nivel dt')).includes('Current level') && (await txt(page, '.pv-fila--sellos dd')) === '3 of 89', 'en: fecha, género y estadísticas en inglés');
  await ctx.close();
}

// ---- pantalla baja
{
  const { ctx, page } = await abrir('vista=pasaporte', { ancho: 360, alto: 560 });
  await abrirDoc(page);
  const d = await page.locator('.pasaporte-libro').boundingBox();
  ok(d.y >= 0 && d.y + d.height <= 560, `en una pantalla de 360x560 el cuaderno cabe completo (${Math.round(d.height)} px de alto)`);
  await ctx.close();
}

// ---------- editar la información ----------
{
  const { ctx, page } = await abrir('vista=pasaporte');
  await abrirDoc(page);
  await activa(page).locator('.pasaporte-editar').click();
  await page.waitForSelector('.pasaporte-edicion');
  const ed = page.locator('.pasaporte-edicion');
  ok((await ed.locator('.oc-titulo-sello').textContent()) === 'Editar información', 'editar: abre el formulario "Editar información"');
  ok((await ed.locator('#ed-usuario').inputValue()) === 'Ryky' && (await ed.locator('#ed-pais').inputValue()) === 'Nicaragua' && (await ed.locator('input[name="ed-idioma"]:checked').getAttribute('value')) === 'es' && (await ed.locator('#ed-nacimiento').inputValue()) === '2000-05-10' && (await ed.locator('.oc-cod').inputValue()) === '+505' && (await ed.locator('#ed-telefono').inputValue()) === '88888888' && (await ed.locator('input[name="ed-genero"]:checked').getAttribute('value')) === 'femenino', 'editar: los campos llegan con los datos actuales');
  ok((await ed.locator('.oc-foto-marco img').getAttribute('src')).includes('cabezon'), 'editar: sin foto propia, el marco muestra el personaje elegido');
  ok((await ed.locator('.oc-foto-pegar').boundingBox()).height >= 44, 'editar: la foto se puede tocar (zona de al menos 44 px)');
  await page.screenshot({ path: path.join(capturas, 'pasaporte_cuaderno_editar.png') });

  await ed.locator('#ed-usuario').fill('');
  await ed.locator('#ed-nacimiento').fill('');
  await ed.locator('.oc-boton--form').click();
  ok((await ed.locator('.oc-msg').allTextContents()).join('|') === 'Escribe tu nombre de usuario.' && (await page.evaluate(() => (window.__guardados || []).length)) === 0, 'editar: sin nombre no guarda (y la fecha vacía no se reclama)');

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
  await page.waitForTimeout(1300);
  const p1 = activa(page);
  ok((await txt(page, '.pv-nombre')) === 'Ryky Viajero' && (await txt(page, '.pv-pais')) === 'Costa Rica' && (await p1.locator('.pv-fila--nacimiento dd').textContent()) === '—' && (await p1.locator('.pv-fila--telefono dd').textContent()) === '—' && (await p1.locator('.pv-fila--idioma dd').textContent()) === 'English', 'editar: al guardar vuelve al pasaporte con los datos nuevos');
  const img = p1.locator('.pv-foto-img');
  ok((await img.getAttribute('src')).startsWith('data:image/jpeg') && (await img.getAttribute('class')).includes('perfil'), 'editar: la foto nueva sale en el pasaporte');
  await ctx.close();
}
{
  const { ctx, page } = await abrir('vista=pasaporte&fallo=1');
  await abrirDoc(page);
  await activa(page).locator('.pasaporte-editar').click();
  await page.waitForSelector('.pasaporte-edicion');
  await page.fill('#ed-usuario', 'Otro nombre');
  await page.click('.pasaporte-edicion .oc-boton--form');
  await page.waitForTimeout(400);
  ok((await txt(page, '.pasaporte-edicion .oc-error')) === 'No se pudo guardar tu información. Intenta de nuevo.' && (await page.locator('.pasaporte-edicion').count()) === 1, 'editar: si falla el guardado, el aviso sale en el formulario');
  ok((await page.inputValue('#ed-usuario')) === 'Otro nombre', 'editar: lo escrito se conserva tras el error');
  await page.click('.pasaporte-edicion-cancelar');
  await page.waitForSelector('.pasaporte-edicion', { state: 'detached' });
  await page.waitForTimeout(300);
  ok((await txt(page, '.pv-nombre')) === 'Ryky', 'editar: Cancelar vuelve al pasaporte sin cambios');
  await ctx.close();
}
{
  const { ctx, page } = await abrir('vista=pasaporte&gigantona=1');
  await abrirDoc(page);
  await activa(page).locator('.pasaporte-editar').click();
  await page.waitForSelector('.pasaporte-edicion');
  ok((await page.locator('.pasaporte-edicion .oc-foto-marco img').getAttribute('src')).includes('gigantona'), 'editar: con la gigantona elegida, el marco muestra a la gigantona');
  await page.keyboard.press('Escape');
  ok((await page.locator('.pasaporte-libro, .pasaporte-edicion').count()) === 0, 'editar: Escape cierra todo el pasaporte');
  await ctx.close();
}

// ---------- desde el Perfil ----------
{
  const { ctx, page } = await abrir('vista=perfil', { esperar: '.perfil-acciones' });
  await page.getByRole('button', { name: 'Mi pasaporte' }).click();
  ok(JSON.stringify(await page.evaluate(() => window.__eventos)) === '[["ir","pasaporteVisual"]]', 'perfil: el botón "Mi pasaporte" abre el pasaporte visual');
  await ctx.close();
}
{
  const { ctx, page } = await abrir('vista=pasaporte&abrir=1');
  await page.waitForSelector('.pasaporte-libro');
  ok((await page.locator('.oc-tapa').isVisible()), 'perfil: llegando desde el perfil el pasaporte se abre en la portada');
  await ctx.close();
}

await browser.close();
await servidor.close();
console.log(`\n${total - fallas.length}/${total} comprobaciones`);
if (fallas.length) { console.log('FALLAS:\n' + fallas.join('\n')); process.exit(1); }
