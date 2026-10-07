// Prueba de la vista del sitio turístico (DetalleSitio) con Supabase simulado, a 360 y 412 px.
// Uso (desde la raíz del proyecto):  node docs/tests/sitio_front/prueba.mjs
// Requiere playwright y su navegador (o CHROMIUM_PATH=ruta/al/ejecutable).
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

const foto = (c) => `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="400" height="280"><rect width="400" height="280" fill="${c}"/></svg>`)}`;
const estado = (extra = {}) => ({
  uid: 'yo', sesion: true, llamadas: [],
  fotos: [
    { id: 1, url: foto('#c9a227'), orden: 0, es_portada: true },
    { id: 2, url: foto('#3f7f7a'), orden: 1, es_portada: false },
    { id: 3, url: foto('#7a3f6e'), orden: 2, es_portada: false },
    { id: 4, url: foto('#3f4f7f'), orden: 3, es_portada: false },
  ],
  resenas: [
    { id: 'a', usuario_id: 'otro', autor: 'Viajero', estrellas: 5, texto: 'Preciosa catedral, subir al techo vale la pena.', fecha: '2026-10-02T10:00:00Z' },
    { id: 'b', usuario_id: 'otro2', autor: 'Viajero', estrellas: 4, texto: 'Muy bonita, llegamos temprano y estaba tranquilo.', fecha: '2026-10-03T10:00:00Z' },
  ],
  ...extra,
});

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});

async function abrir(ancho, db, query = '') {
  const ctx = await browser.newContext({ viewport: { width: ancho, height: 800 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  const errores = [];
  page.on('pageerror', (e) => errores.push(e.message));
  await page.addInitScript((d) => { window.__db = d; }, db);
  await page.goto(`${base}${query}`);
  await page.waitForSelector('.sitio-detalle-nombre, .nivel-progreso');
  await page.waitForTimeout(500);
  return { ctx, page, errores };
}

for (const ancho of [360, 412]) {
  const t = `[${ancho}px]`;
  const { ctx, page, errores } = await abrir(ancho, estado());

  ok((await page.textContent('.sitio-detalle-nombre')) === 'Catedral de León', `${t} el nombre del sitio sale en el hero`);
  ok((await page.textContent('.sitio-detalle-ciudad')).includes('León, Nicaragua'), `${t} ciudad bajo el nombre`);
  ok((await page.textContent('.sitio-detalle-chip')).length > 0, `${t} chip de categoría`);
  ok((await page.locator('.sitio-detalle-datos > div').count()) === 4, `${t} 4 datos rápidos en fila`);
  const datos = await page.textContent('.sitio-detalle-datos');
  ok(datos.includes('30 – 60 min') && datos.includes('Entrada libre') && datos.includes('Turismo'), `${t} valores por defecto de los datos rápidos`);
  ok((await page.locator('text=Sobre este lugar').count()) === 1, `${t} sección "Sobre este lugar"`);
  ok((await page.locator('text=Leer historia completa').count()) === 1, `${t} botón de historia completa`);
  ok((await page.locator('text=¿Sabías que').count()) === 1 && (await page.locator('text=¿Por qué es importante?').count()) === 1, `${t} las dos tarjetas`);
  const lado = await page.evaluate(() => {
    const [a, b] = [...document.querySelectorAll('.sitio-detalle-pareja > section')].map((e) => e.getBoundingClientRect());
    return a && b ? Math.abs(a.top - b.top) < 2 && b.left > a.left : false;
  });
  ok(lado, `${t} las dos tarjetas van lado a lado`);
  ok((await page.locator('.sitio-detalle-galeria li').count()) === 4, `${t} la galería muestra las 4 fotos`);
  ok((await page.locator('.sitio-detalle-pasaporte').textContent()).includes('+50 XP'), `${t} banner del pasaporte con +50 XP`);
  ok((await page.locator('.resenas-resumen').textContent()).includes('2 reseñas'), `${t} reseñas: resumen con 2 reseñas`);
  ok((await page.locator('text=Escribir reseña').count()) === 1, `${t} con sesión se puede escribir sin sello`);
  ok((await page.locator('text=Escanea el sello').count()) === 0, `${t} no se pide sello`);

  const sinDesborde = await page.evaluate(() => document.querySelector('.sitio-detalle').scrollWidth <= window.innerWidth + 1);
  ok(sinDesborde, `${t} sin desplazamiento horizontal`);
  const chicos = await page.evaluate(() => [...document.querySelectorAll('.sitio-detalle button')]
    .filter((b) => { const r = b.getBoundingClientRect(); return r.width > 0 && (r.height < 44 || r.width < 44); })
    .map((b) => b.className || b.textContent));
  ok(chicos.length === 0, `${t} botones de al menos 44 px (${chicos.join(', ') || 'todos'})`);

  // botones del hero y del pie
  await page.click('[aria-label="Volver al mapa"]');
  await page.click('[aria-label="Cerrar"]');
  await page.click('[aria-label="Guardar sitio"]');
  await page.click('text=Leer historia completa');
  await page.click('text=Ver ruta');
  await page.click('text=Llegar al sitio');
  const ev = await page.evaluate(() => window.__eventos.map((e) => e[0]).join(','));
  ok(ev === 'volver,cerrar,guardar,historia,ruta,llegar', `${t} los botones llaman a sus acciones (${ev})`);

  // pie fijo visible al final
  await page.evaluate(() => { const s = document.querySelector('.sitio-detalle'); s.scrollTop = s.scrollHeight; });
  const pie = await page.evaluate(() => { const r = document.querySelector('.sitio-detalle-pie').getBoundingClientRect(); return r.bottom <= window.innerHeight + 1 && r.height > 0; });
  ok(pie, `${t} los botones del fondo quedan fijos`);

  // escribir una reseña: primero incompleta, luego completa
  await page.click('text=Escribir reseña');
  await page.fill('textarea', 'Muy corto');
  ok((await page.locator('.resenas-boton-principal[aria-disabled="true"]').count()) > 0, `${t} comentario corto y sin estrellas: el botón de publicar está apagado`);
  await page.locator('[role="radio"]').nth(4).click();
  await page.fill('textarea', 'Una visita inolvidable, la guía fue excelente.');
  ok((await page.locator('textarea').getAttribute('maxlength')) === '1000', `${t} el comentario admite hasta 1000 caracteres`);
  await page.click('text=Publicar reseña');
  await page.waitForTimeout(600);
  ok((await page.locator('.resenas-resumen').textContent()).includes('3 reseñas'), `${t} la reseña nueva se suma (3 reseñas)`);
  ok((await page.locator('.resenas-item--mia').count()) === 1, `${t} mi reseña se marca como mía`);
  ok((await page.locator('text=Editar mi reseña').count()) === 1 && (await page.locator('text=Eliminar mi reseña').count()) === 1, `${t} aparecen editar y eliminar`);
  await page.click('text=Eliminar mi reseña');
  await page.locator('button:has-text("Eliminar")').last().click();
  await page.waitForTimeout(600);
  ok((await page.locator('.resenas-resumen').textContent()).includes('2 reseñas'), `${t} eliminar mi reseña la quita`);

  ok(errores.length === 0, `${t} sin errores de página (${errores.join('; ')})`);
  await page.evaluate(() => { document.querySelector('.sitio-detalle').scrollTop = 0; });
  await page.screenshot({ path: path.join(capturas, `sitio_detalle_${ancho}_arriba.png`) });
  await ctx.close();

  // sin sesión y sin fotos
  const s2 = await abrir(ancho, estado({ sesion: false, fotos: [] }));
  ok((await s2.page.locator('text=Inicia sesión para dejar tu reseña').count()) === 1, `${t} sin sesión: aviso de iniciar sesión`);
  ok((await s2.page.locator('text=Escribir reseña').count()) === 0, `${t} sin sesión: no hay botón de escribir`);
  ok((await s2.page.locator('.sitio-detalle-galeria').count()) === 0, `${t} sin fotos: no se dibuja la galería`);
  await s2.page.evaluate(() => { const s = document.querySelector('.sitio-detalle'); s.scrollTop = s.scrollHeight / 2; });
  await s2.page.screenshot({ path: path.join(capturas, `sitio_detalle_${ancho}_medio.png`) });
  await s2.ctx.close();

  // guardado
  const s3 = await abrir(ancho, estado(), '?guardado=1');
  ok((await s3.page.locator('[aria-label="Quitar de guardados"]').count()) === 1, `${t} guardado: el corazón lo indica`);
  await s3.ctx.close();
}

// Niveles y rangos (038): pasaporte y banner del sitio
const rangosBase = [{ id: 1, rango: 'oro' }, { id: 6, rango: 'plata' }, { id: 12, rango: 'cobre' }];
for (const ancho of [360, 412]) {
  const t = `[${ancho}px nivel]`;
  const nivel = { nivel_actual: 3, puntos_actuales: 0.5, puntos_para_siguiente: 6, porcentaje: 8, puntos_totales: 6.5 };
  const pas = await abrir(ancho, estado({ nivel, sitioFila: rangosBase }), '?vista=pasaporte');
  await pas.page.waitForSelector('.nivel-progreso');
  await pas.page.waitForTimeout(400);
  ok((await pas.page.locator('.nivel-progreso-nivel').textContent()) === 'Nivel 3', `${t} el pasaporte muestra el nivel 3`);
  ok((await pas.page.locator('.nivel-progreso-puntos').textContent()).trim() === '0.5 / 6 puntos', `${t} puntos actuales / necesarios (0.5 / 6)`);
  ok((await pas.page.locator('.nivel-progreso-relleno').evaluate((e) => e.style.width)) === '8%', `${t} la barra avanza 8 %`);
  ok((await pas.page.locator('.nivel-progreso-pie').textContent()).includes('Para el nivel 4: 5.5 puntos más'), `${t} faltan 5.5 puntos para el nivel 4`);
  ok((await pas.page.locator('[role="progressbar"]').getAttribute('aria-valuetext')).includes('0.5 de 6'), `${t} la barra es accesible (aria-valuetext)`);
  await pas.page.click('.ciudad-card:has-text("León")'); // los sellos se ven dentro de la ciudad
  await pas.page.waitForSelector('.sello-card');
  const rangoDe = (nombre) => pas.page.locator('.sello-card', { hasText: nombre }).first().locator('.rango-sello-nombre').textContent();
  ok((await rangoDe('Catedral de León')) === 'Oro', `${t} Catedral: oro`);
  ok((await rangoDe('Museo de la Revolución')) === 'Plata', `${t} Museo de la Revolución: plata`);
  ok((await rangoDe('Parque de los Poetas')) === 'Cobre', `${t} un sitio cobre`);
  ok((await rangoDe('Puerto Salvador Allende')) === 'Cobre', `${t} un sitio que no está en la base vale cobre`);
  ok((await pas.page.locator('.sello-card .rango-sello').count()) === (await pas.page.locator('.sello-card').count()), `${t} cada insignia lleva su rango`);
  const colores = await pas.page.evaluate(() => ['oro', 'plata', 'cobre'].map((r) => getComputedStyle(document.querySelector(`.rango-sello--${r} .rango-sello-punto`)).backgroundColor));
  ok(new Set(colores).size === 3, `${t} los tres rangos tienen colores distintos (${colores.join(' | ')})`);
  ok(await pas.page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), `${t} el pasaporte no se desborda`);
  await pas.page.screenshot({ path: path.join(capturas, `pasaporte_nivel_${ancho}.png`) });
  ok(pas.errores.length === 0, `${t} sin errores de página (${pas.errores.join('; ')})`);
  await pas.ctx.close();

  for (const [id, esperado] of [[1, 'Sello de ORO · 2 puntos'], [6, 'Sello de PLATA · 0.5 puntos'], [12, 'Sello de COBRE · 1 punto']]) {
    const d = await abrir(ancho, estado({ sitioFila: rangosBase }), `?sitio=${id}`);
    await d.page.waitForSelector('.sitio-detalle-rango');
    const texto = (await d.page.locator('.sitio-detalle-rango').textContent()).replace(/\s+/g, ' ').trim();
    ok(texto === esperado, `${t} banner del sitio ${id}: "${texto}"`);
    ok((await d.page.locator('.sitio-detalle-pasaporte').textContent()).includes('+50 XP'), `${t} el banner del sitio ${id} conserva +50 XP`);
    if (id === 1) {
      await d.page.evaluate(() => { const s = document.querySelector('.sitio-detalle'); s.scrollTop = s.scrollHeight; });
      await d.page.screenshot({ path: path.join(capturas, `banner_rango_${ancho}.png`) });
    }
    await d.ctx.close();
  }
}

// Lightbox de la galería
const fotoGrande = `data:image/svg+xml;utf8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="3000" height="2000"><rect width="3000" height="2000" fill="#335"/></svg>')}`;
for (const ancho of [360, 412]) {
  const t = `[${ancho}px lightbox]`;
  const db = estado();
  db.fotos[3].url = fotoGrande;
  const { ctx, page, errores } = await abrir(ancho, db);
  const caja = (sel) => page.evaluate((s) => { const r = document.querySelector(s).getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; }, sel);

  const antes = await caja('.sitio-detalle-galeria li:nth-child(1) img');
  ok(antes.w === 170 && antes.h === 120, `${t} la miniatura mantiene su tamaño (${antes.w}x${antes.h})`);

  await page.click('.sitio-detalle-galeria li:nth-child(1) button');
  await page.waitForSelector('.lightbox');
  const ov = await caja('.lightbox');
  ok(ov.x === 0 && ov.y === 0 && ov.w === ancho && ov.h === 800, `${t} el fondo cubre toda la pantalla`);
  ok((await page.evaluate(() => getComputedStyle(document.querySelector('.lightbox')).backgroundColor)).startsWith('rgba(0, 0, 0'), `${t} fondo negro semitransparente`);
  const z = await page.evaluate(() => {
    const zs = [...document.querySelectorAll('body *')].map((e) => parseInt(getComputedStyle(e).zIndex, 10)).filter(Number.isFinite);
    return { lb: parseInt(getComputedStyle(document.querySelector('.lightbox')).zIndex, 10), max: Math.max(...zs) };
  });
  ok(z.lb === z.max, `${t} z-index por encima de todo (${z.lb})`);
  let f = await caja('.lightbox-foto');
  // Foto de 400x280: a su tamaño original si cabe; en pantallas más angostas que 421 px, al 95 % del ancho (sin deformar)
  const anchoEsperado = Math.min(400, ancho * 0.95);
  ok(Math.abs(f.w - anchoEsperado) < 1 && Math.abs(f.w / f.h - 400 / 280) < 0.01, `${t} foto pequeña a su tamaño original o 95 % del ancho (${Math.round(f.w)}x${Math.round(f.h)})`);
  ok(Math.abs(f.x + f.w / 2 - ancho / 2) < 1 && Math.abs(f.y + f.h / 2 - 400) < 1, `${t} foto centrada`);
  ok((await page.locator('.lightbox-contador').textContent()) === '1 / 4', `${t} contador 1 / 4`);

  await page.click('[aria-label="Foto siguiente"]');
  ok((await page.locator('.lightbox-contador').textContent()) === '2 / 4', `${t} flecha → pasa a la 2`);
  await page.click('[aria-label="Foto anterior"]');
  await page.click('[aria-label="Foto anterior"]');
  ok((await page.locator('.lightbox-contador').textContent()) === '4 / 4', `${t} flecha ← desde la 1 da la vuelta a la última`);
  f = await caja('.lightbox-foto');
  ok(f.w <= ancho * 0.95 + 1 && f.h <= 800 * 0.95 + 1 && Math.abs(f.w / f.h - 1.5) < 0.01, `${t} foto enorme: máximo 95 % de la pantalla y sin deformar (${Math.round(f.w)}x${Math.round(f.h)})`);

  // swipe con el dedo (eventos táctiles reales)
  const deslizar = (dx) => page.evaluate((d) => {
    const el = document.querySelector('.lightbox');
    const mk = (tipo, x) => new TouchEvent(tipo, { bubbles: true, cancelable: true,
      touches: tipo === 'touchend' ? [] : [new Touch({ identifier: 1, target: el, clientX: x, clientY: 300 })],
      changedTouches: [new Touch({ identifier: 1, target: el, clientX: x, clientY: 300 })] });
    el.dispatchEvent(mk('touchstart', 200)); el.dispatchEvent(mk('touchmove', 200 + d / 2)); el.dispatchEvent(mk('touchend', 200 + d));
  }, dx);
  await deslizar(-120);
  ok((await page.locator('.lightbox-contador').textContent()) === '1 / 4', `${t} swipe a la izquierda -> siguiente`);
  await deslizar(120);
  ok((await page.locator('.lightbox-contador').textContent()) === '4 / 4', `${t} swipe a la derecha -> anterior`);
  await deslizar(-20);
  ok((await page.locator('.lightbox-contador').textContent()) === '4 / 4', `${t} un roce corto no cambia de foto`);

  await page.keyboard.press('ArrowLeft');
  ok((await page.locator('.lightbox-contador').textContent()) === '3 / 4', `${t} teclado: flecha izquierda`);

  // cerrar: tocar la foto no cierra; tocar fuera, X y Escape sí
  await page.click('.lightbox-foto');
  ok((await page.locator('.lightbox').count()) === 1, `${t} tocar la foto no cierra`);
  await page.mouse.click(ancho - 3, 790);
  ok((await page.locator('.lightbox').count()) === 0, `${t} tocar fuera cierra`);
  await page.click('.sitio-detalle-galeria li:nth-child(2) button');
  ok((await page.locator('.lightbox-contador').textContent()) === '2 / 4', `${t} abre en la foto tocada (2)`);
  await page.click('[aria-label="Cerrar foto"]');
  ok((await page.locator('.lightbox').count()) === 0, `${t} la X cierra`);
  await page.click('.sitio-detalle-galeria li:nth-child(1) button');
  await page.keyboard.press('Escape');
  ok((await page.locator('.lightbox').count()) === 0, `${t} Escape cierra`);
  ok((await page.locator('.sitio-detalle-nombre').count()) === 1, `${t} la ficha sigue abierta debajo`);
  ok(errores.length === 0, `${t} sin errores de página (${errores.join('; ')})`);

  await page.click('.sitio-detalle-galeria li:nth-child(1) button');
  await page.screenshot({ path: path.join(capturas, `lightbox_${ancho}.png`) });
  await ctx.close();
}

// Panel del mapa: portada de sitio_foto > imagen_url > (foto local) > fondo azul con el ícono
for (const ancho of [360, 412]) {
  const t = `[${ancho}px panel]`;
  const abrirPanel = async (db, sitioId = 1) => {
    const ctx = await browser.newContext({ viewport: { width: ancho, height: 800 }, deviceScaleFactor: 2 });
    const page = await ctx.newPage();
    await page.addInitScript((d) => { window.__db = d; }, db);
    await page.goto(`${base}?vista=panel&sitio=${sitioId}`);
    await page.waitForSelector('.panel-sitio');
    await page.waitForTimeout(500);
    return { ctx, page };
  };
  const medidas = (page) => page.evaluate(() => {
    const f = document.querySelector('.panel-sitio-foto').getBoundingClientRect();
    const p = document.querySelector('.panel-sitio').getBoundingClientRect();
    const e = getComputedStyle(document.querySelector('.panel-sitio-foto'));
    return { alto: Math.round(f.height), izq: Math.round(f.left - p.left), ancho: Math.round(f.width), panel: Math.round(p.width), arriba: Math.round(f.top - p.top), ajuste: e.objectFit, esq: e.borderTopLeftRadius };
  });

  // 1. con portada en sitio_foto
  const a = await abrirPanel(estado({ portada: [{ url: foto('#c9a227') }], sitioFila: [{ imagen_url: foto('#ff0000') }] }));
  ok((await a.page.locator('img.panel-sitio-foto').getAttribute('src')) === foto('#c9a227'), `${t} usa la portada de sitio_foto`);
  const m = await medidas(a.page);
  ok(m.alto === 160 && m.ajuste === 'cover' && m.arriba === 0 && m.izq === 0 && m.ancho === m.panel, `${t} foto de 160 px, cover, a ras arriba (${JSON.stringify(m)})`);
  ok(parseInt(m.esq, 10) > 0, `${t} esquinas de arriba redondeadas (${m.esq})`);
  await a.page.screenshot({ path: path.join(capturas, `panel_sitio_${ancho}_foto.png`) });
  await a.ctx.close();

  // 2. sin portada: imagen_url del sitio
  const b = await abrirPanel(estado({ portada: [], sitioFila: [{ imagen_url: foto('#ff0000') }] }));
  ok((await b.page.locator('img.panel-sitio-foto').getAttribute('src')) === foto('#ff0000'), `${t} sin portada usa imagen_url`);
  await b.ctx.close();

  // 3. sin nada (sitio 3 no tiene foto local): fondo azul con el ícono
  const c = await abrirPanel(estado({ portada: [], sitioFila: [{ imagen_url: null }] }), 3);
  const vacia = await c.page.evaluate(() => { const e = document.querySelector('.panel-sitio-foto--vacia'); return e ? { fondo: getComputedStyle(e).backgroundColor, icono: !!e.querySelector('img'), alto: Math.round(e.getBoundingClientRect().height) } : null; });
  ok(vacia && vacia.alto === 160 && vacia.icono && vacia.fondo === 'rgb(26, 26, 46)', `${t} sin foto: fondo azul marino con el ícono (${JSON.stringify(vacia)})`);
  await c.page.screenshot({ path: path.join(capturas, `panel_sitio_${ancho}_vacio.png`) });
  await c.ctx.close();
}

await browser.close();
await servidor.close();
console.log(`\n${total - fallas.length}/${total} comprobaciones`);
if (fallas.length) { console.log('FALLAS:\n' + fallas.join('\n')); process.exit(1); }
