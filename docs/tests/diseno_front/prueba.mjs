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
  // Las imágenes que "sube" el arnés son URLs https del bucket: se responden con un dibujo para que se vean
  await ctx.route('https://spybqychnydgvidwjrlh.supabase.co/**', (ruta) => ruta.fulfill({
    contentType: 'image/svg+xml',
    body: "<svg xmlns='http://www.w3.org/2000/svg' width='600' height='300'><rect width='600' height='300' fill='#d98c3a'/><circle cx='300' cy='150' r='80' fill='#fff3d6'/></svg>",
  }));
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
    ok(await page.locator('.perfilpublico-descripcion').innerText() === 'Café de altura en el centro de León.', `${t} sin descripción en el diseño: usa la del perfil, bajo el nombre`);
    const yNombre = (await page.locator('.perfilpublico-nombre').boundingBox()).y;
    const yDescripcion = (await page.locator('.perfilpublico-descripcion').boundingBox()).y;
    const yPastillas = (await page.locator('.perfilpublico-pastillas').boundingBox()).y;
    ok(yNombre < yDescripcion && yDescripcion < yPastillas, `${t} la descripción va debajo del nombre y antes de las pastillas`);
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
    const cfg = { paleta: 'terracota', letra: 'elegante', whatsapp: '87074097', secciones_visibles: ['resenas', 'productos', 'horarios'], layout_productos: 'lista', portada_url: null, descripcion: 'Texto del diseño\nsegunda línea', logo_url: 'https://spybqychnydgvidwjrlh.supabase.co/storage/v1/object/public/negocios/u/logo_1.png' };
    const { ctx, page, errores } = await abrir(ancho, 'ficha', datos(cfg));
    await page.waitForSelector('.perfilpublico-whatsapp');
    await page.waitForSelector('.resenas-seccion');
    ok(await variable(page, '--ficha-color') === '#C0622A', `${t} guardado: paleta terracota`);
    ok((await variable(page, '--ficha-titulo')).includes('Playfair Display'), `${t} guardado: letra elegante (Playfair Display)`);
    ok(await page.locator('.perfilpublico-whatsapp').getAttribute('href') === 'https://wa.me/50587074097', `${t} WhatsApp de 8 dígitos abre wa.me/505…`);
    ok((await titulos(page)).join('|') === 'Reseñas|Productos|Horarios', `${t} guardado: orden Reseñas, Productos, Horarios (Fotos y Actividades ocultas)`);
    ok(await page.locator('.perfilpublico-productos.perfilpublico-lista').count() === 1, `${t} productos en lista`);
    ok(await page.locator('.perfilpublico-descripcion').innerText() === 'Texto del diseño\nsegunda línea', `${t} guardado: la descripción del diseño manda y respeta los saltos de línea`);
    const fondo = await page.locator('.perfilpublico-whatsapp').evaluate((e) => getComputedStyle(e).backgroundColor);
    ok(fondo === 'rgb(192, 98, 42)', `${t} el botón de WhatsApp usa el color de la paleta (${fondo})`);
    ok(await page.locator('.perfilpublico-logo img').getAttribute('src') === 'https://spybqychnydgvidwjrlh.supabase.co/storage/v1/object/public/negocios/u/logo_1.png', `${t} guardado: la ficha usa el logo_url del diseño`);
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

  // 3b. La descripción es texto plano: el HTML no se interpreta
  {
    const malo = '<img src=x onerror="window.__xss=1"><b>negrita</b>';
    const { ctx, page, errores } = await abrir(ancho, 'ficha', datos({ descripcion: malo }));
    await page.waitForSelector('.perfilpublico-descripcion');
    ok(await page.locator('.perfilpublico-descripcion').innerText() === malo, `${t} descripción con HTML: se ve como texto literal`);
    ok(await page.locator('.perfilpublico-descripcion img, .perfilpublico-descripcion b').count() === 0 && !(await page.evaluate(() => window.__xss)), `${t} descripción con HTML: no crea elementos ni ejecuta nada`);
    ok(errores.length === 0, `${t} descripción con HTML: sin errores de página`);
    await ctx.close();
  }

  // 3c. Sin descripción en ningún lado: no se dibuja nada (ni texto de relleno)
  {
    const { ctx, page } = await abrir(ancho, 'ficha-sin-descripcion', datos({}));
    await page.waitForSelector('.perfilpublico-nombre');
    ok(await page.locator('.perfilpublico-descripcion').count() === 0, `${t} sin descripción: no se dibuja el párrafo`);
    ok(await page.getByText('aún no agregó una descripción').count() === 0, `${t} sin descripción: ya no hay texto de relleno`);
    await ctx.close();
  }

  // 3d. Sin fotos: no hay sección Fotos en la ficha; con fotos pero sección oculta, tampoco
  {
    const d = datos({});
    d.fotos = [];
    const { ctx, page } = await abrir(ancho, 'ficha', d);
    await page.waitForSelector('.perfilpublico-nombre');
    await page.waitForSelector('.resenas-seccion');
    ok(!(await titulos(page)).includes('Fotos'), `${t} sin fotos: la ficha no dibuja la sección Fotos`);
    await ctx.close();
  }
  {
    const { ctx, page } = await abrir(ancho, 'ficha', datos({ secciones_visibles: ['horarios', 'productos'] }));
    await page.waitForSelector('.perfilpublico-nombre');
    ok(!(await titulos(page)).includes('Fotos'), `${t} con fotos pero la sección oculta: tampoco aparece`);
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

  // 5. Editor (a todo el ancho, sin vista previa)
  {
    const { ctx, page, errores } = await abrir(ancho, 'editor', datos({}));
    await page.waitForSelector('.editor-diseno');
    const nombres = () => page.$$eval('.editor-diseno-seccion-nombre', (els) => els.map((e) => e.textContent.trim()));
    ok(await page.locator('.editor-diseno-vista, .perfilpublico-ficha').count() === 0, `${t} editor: no hay panel de vista previa`);
    const caja = await page.locator('.editor-diseno').boundingBox();
    ok(caja.width >= ancho - 40, `${t} editor: ocupa todo el ancho (${Math.round(caja.width)} de ${ancho})`);
    ok(await page.locator('.editor-diseno-paleta').count() === 8, `${t} editor: 8 paletas`);
    ok(await page.locator('.editor-diseno-paleta[aria-checked="true"]').getAttribute('aria-label') === 'Azul marino', `${t} editor: azul marino seleccionada`);
    ok(await page.getByRole('button', { name: 'Guardar' }).isDisabled() && await page.getByRole('button', { name: 'Deshacer' }).isDisabled(), `${t} editor: sin cambios, Guardar y Deshacer desactivados`);
    ok(await sinDesborde(page), `${t} editor sin desborde horizontal`);

    // Cabecera: fondo azul marino, nombre blanco, subtítulo, inicial en cuadro gris claro
    const cab = await page.locator('.editor-diseno-cabecera').evaluate((e) => getComputedStyle(e).backgroundColor);
    ok(cab === 'rgb(27, 42, 107)', `${t} cabecera: fondo #1B2A6B (${cab})`);
    ok(await page.locator('.editor-diseno-cabecera h2').evaluate((e) => getComputedStyle(e).color) === 'rgb(255, 255, 255)', `${t} cabecera: nombre en blanco`);
    ok(await page.locator('.editor-diseno-cabecera h2').evaluate((e) => Number(getComputedStyle(e).fontWeight) >= 700), `${t} cabecera: nombre en negrita`);
    ok(await page.locator('.editor-diseno-cabecera p').innerText() === 'Vista previa en vivo', `${t} cabecera: subtítulo "Vista previa en vivo"`);
    ok(await page.locator('.editor-diseno-logo span').first().innerText() === 'C', `${t} cabecera: sin logo muestra la inicial`);
    ok(await page.locator('.editor-diseno-logo').evaluate((e) => getComputedStyle(e).backgroundColor) === 'rgb(232, 234, 240)', `${t} cabecera: cuadro gris claro`);

    // Descripción: textarea bajo el header, contador X/300, tope de 300
    const desc = page.getByRole('textbox', { name: 'Descripción' });
    ok(await desc.getAttribute('placeholder') === 'Describe tu negocio...' && await desc.getAttribute('maxlength') === '300', `${t} descripción: placeholder "Describe tu negocio..." y máximo 300`);
    ok(await desc.inputValue() === 'Café de altura en el centro de León.' && await page.locator('#ed-descripcion-contador').innerText() === '36/300', `${t} descripción: parte de la descripción del perfil y muestra 36/300`);
    const yCabecera = (await page.locator('.editor-diseno-cabecera').boundingBox()).y + (await page.locator('.editor-diseno-cabecera').boundingBox()).height;
    const yDesc = (await desc.boundingBox()).y;
    const yColores = (await page.locator('#ed-colores').boundingBox()).y;
    ok(yDesc > yCabecera && yDesc < yColores, `${t} descripción: está bajo el header y sobre los colores`);
    ok(await page.getByRole('button', { name: 'Guardar' }).isDisabled(), `${t} descripción: abrir el editor no cuenta como cambio`);
    await desc.fill('x'.repeat(400));
    ok((await desc.inputValue()).length === 300 && await page.locator('#ed-descripcion-contador').innerText() === '300/300', `${t} descripción: no pasa de 300 caracteres (300/300)`);
    await desc.fill('Hola mundo');
    ok(await page.locator('#ed-descripcion-contador').innerText() === '10/300' && await page.getByRole('button', { name: 'Guardar' }).isEnabled(), `${t} descripción: contador 10/300 y Guardar activo`);
    await page.getByRole('button', { name: 'Deshacer' }).click();
    ok(await desc.inputValue() === 'Café de altura en el centro de León.' && await page.getByRole('button', { name: 'Guardar' }).isDisabled(), `${t} descripción: Deshacer la devuelve`);

    // Fotos del negocio: subir, límite, quitar, reordenar (se guardan al instante, no con Guardar)
    ok(await page.getByRole('heading', { name: 'Fotos del negocio' }).count() === 1 && await page.locator('#ed-fotos-contador').innerText() === '0/10', `${t} fotos: sección "Fotos del negocio" con contador 0/10`);
    ok(await page.locator('input[data-campo=fotos]').getAttribute('accept') === 'image/jpeg,image/png,image/webp' && await page.locator('input[data-campo=fotos]').getAttribute('multiple') !== null, `${t} fotos: el selector solo acepta jpg, png y webp y permite varias`);
    const archivo = (nombre, tipo = 'image/jpeg', tam = 10) => ({ name: nombre, mimeType: tipo, buffer: Buffer.alloc(tam, 1) });
    const orden = () => page.$$eval('.editor-diseno-foto', (els) => els.map((e) => Number(e.getAttribute('data-id'))));
    await page.setInputFiles('input[data-campo=fotos]', [archivo('a.jpg'), archivo('b.png', 'image/png'), archivo('c.webp', 'image/webp')]);
    await page.waitForFunction(() => document.querySelectorAll('.editor-diseno-foto').length === 3);
    ok(await page.locator('#ed-fotos-contador').innerText() === '3/10', `${t} fotos: se subieron tres (3/10)`);
    ok((await orden()).join(',') === '1,2,3', `${t} fotos: en el orden en que se subieron`);
    ok(await page.getByRole('button', { name: 'Mover foto 1 antes' }).count() === 0 && await page.getByRole('button', { name: 'Mover foto 3 después' }).count() === 0, `${t} fotos: la primera no se mueve atrás ni la última adelante`);
    ok(await page.getByRole('button', { name: 'Guardar' }).isDisabled(), `${t} fotos: no cuentan como cambio del diseño (Guardar sigue desactivado)`);

    await page.getByRole('button', { name: 'Mover foto 1 después' }).click();
    await page.waitForFunction(() => document.querySelector('.editor-diseno-foto').getAttribute('data-id') === '2');
    ok((await orden()).join(',') === '2,1,3', `${t} fotos: el botón "después" mueve la primera -> ${(await orden()).join(',')}`);
    ok(JSON.stringify((await page.evaluate(() => window.__llamadas)).filter((l) => l[0] === 'ordenar').pop()[1]) === '[2,1,3]', `${t} fotos: se guardó el orden completo [2,1,3]`);

    // arrastrar la tercera hasta el primer lugar
    const asaFoto = await page.getByRole('button', { name: 'Arrastrar foto 3' }).boundingBox();
    const primeraFoto = await page.locator('.editor-diseno-foto').first().boundingBox();
    await page.mouse.move(asaFoto.x + asaFoto.width / 2, asaFoto.y + asaFoto.height / 2);
    await page.mouse.down();
    await page.mouse.move(primeraFoto.x + 20, primeraFoto.y + 20, { steps: 14 });
    await page.mouse.up();
    await page.waitForFunction(() => document.querySelector('.editor-diseno-foto').getAttribute('data-id') === '3');
    ok((await orden()).join(',') === '3,2,1', `${t} fotos: arrastrar la tercera al primer lugar -> ${(await orden()).join(',')}`);
    ok(JSON.stringify((await page.evaluate(() => window.__llamadas)).filter((l) => l[0] === 'ordenar').pop()[1]) === '[3,2,1]', `${t} fotos: al soltar se guardó [3,2,1]`);

    // quitar
    await page.getByRole('button', { name: 'Quitar foto 2', exact: true }).click();
    await page.waitForFunction(() => document.querySelectorAll('.editor-diseno-foto').length === 2);
    ok((await orden()).join(',') === '3,1' && await page.locator('#ed-fotos-contador').innerText() === '2/10', `${t} fotos: la X quita la foto (quedan 3,1 y 2/10)`);

    // rechazos del lado del cliente (las mismas reglas que la base y el bucket)
    await page.setInputFiles('input[data-campo=fotos]', archivo('animada.gif', 'image/gif'));
    ok(await page.getByRole('alert').filter({ hasText: 'no es JPG, PNG ni WebP' }).isVisible(), `${t} fotos: un GIF se rechaza con mensaje`);
    await page.setInputFiles('input[data-campo=fotos]', archivo('enorme.jpg', 'image/jpeg', 10 * 1024 * 1024 + 1));
    ok(await page.getByRole('alert').filter({ hasText: 'pesa más de 10 MB' }).isVisible(), `${t} fotos: más de 10 MB se rechaza con mensaje`);
    ok(await page.locator('.editor-diseno-foto').count() === 2, `${t} fotos: los rechazos no agregan nada`);

    // llegar a 10: el botón se desactiva
    await page.setInputFiles('input[data-campo=fotos]', Array.from({ length: 8 }, (_, i) => archivo(`f${i}.jpg`)));
    await page.waitForFunction(() => document.querySelectorAll('.editor-diseno-foto').length === 10);
    ok(await page.locator('#ed-fotos-contador').innerText() === '10/10', `${t} fotos: 10/10`);
    ok(await page.getByRole('button', { name: 'Llegaste al máximo de fotos' }).isDisabled(), `${t} fotos: con 10 el botón de subir se desactiva`);
    await page.setInputFiles('input[data-campo=fotos]', archivo('once.jpg'));
    ok(await page.locator('.editor-diseno-foto').count() === 10, `${t} fotos: una undécima no entra`);
    ok(await sinDesborde(page), `${t} fotos: 10 miniaturas sin desborde horizontal`);
    await page.screenshot({ path: path.join(capturas, `diseno_editor_fotos_${ancho}.png`), fullPage: true });
    // dejar el editor como estaba para el resto de la prueba
    for (let k = 0; k < 10; k += 1) await page.getByRole('button', { name: 'Quitar foto 1', exact: true }).click();
    await page.waitForFunction(() => document.querySelectorAll('.editor-diseno-foto').length === 0);
    ok(await page.locator('#ed-fotos-contador').innerText() === '0/10', `${t} fotos: se pueden quitar todas (0/10)`);

    // Secciones: orden, flechas de las puntas, asas
    ok((await nombres()).join('|') === 'Horarios|Productos|Fotos|Actividades|Reseñas', `${t} secciones: las cinco, en el orden guardado`);
    ok(await page.getByRole('button', { name: 'Subir Horarios' }).count() === 0, `${t} secciones: la primera no tiene ↑`);
    ok(await page.getByRole('button', { name: 'Bajar Reseñas' }).count() === 0, `${t} secciones: la última no tiene ↓`);
    ok(await page.getByRole('button', { name: 'Bajar Horarios' }).count() === 1 && await page.getByRole('button', { name: 'Subir Reseñas' }).count() === 1, `${t} secciones: las demás flechas sí`);
    ok(await page.getByRole('button', { name: /^Arrastrar / }).count() === 5, `${t} secciones: cinco asas de arrastre`);
    ok(await page.locator('.editor-diseno-seccion').nth(1).evaluate((e) => getComputedStyle(e).borderTopWidth) === '1px', `${t} secciones: separador entre filas`);

    await page.getByRole('button', { name: 'Bajar Horarios' }).click();
    ok((await nombres()).join('|') === 'Productos|Horarios|Fotos|Actividades|Reseñas', `${t} secciones: ↓ baja Horarios`);
    await page.getByRole('button', { name: 'Subir Horarios' }).click();
    ok((await nombres()).join('|') === 'Horarios|Productos|Fotos|Actividades|Reseñas', `${t} secciones: ↑ la devuelve`);
    ok(await page.getByRole('button', { name: 'Guardar' }).isDisabled(), `${t} secciones: volver al orden original = sin cambios`);

    // Arrastrar: Reseñas (fila 5) hasta la fila 1
    const asa = await page.getByRole('button', { name: 'Arrastrar Reseñas' }).boundingBox();
    const primera = await page.locator('.editor-diseno-seccion').first().boundingBox();
    await page.mouse.move(asa.x + asa.width / 2, asa.y + asa.height / 2);
    await page.mouse.down();
    await page.mouse.move(asa.x + asa.width / 2, primera.y + 10, { steps: 12 });
    await page.mouse.up();
    ok((await nombres()).join('|') === 'Reseñas|Horarios|Productos|Fotos|Actividades', `${t} secciones: arrastrar Reseñas a la primera fila -> ${(await nombres()).join('|')}`);

    // Toggle
    await page.getByRole('switch', { name: 'Mostrar Fotos' }).click();
    ok(await page.getByRole('switch', { name: 'Mostrar Fotos' }).getAttribute('aria-checked') === 'false', `${t} secciones: el toggle oculta Fotos`);

    // Logo
    await page.setInputFiles('input[data-campo=logo]', { name: 'logo.png', mimeType: 'image/png', buffer: Buffer.from('x') });
    await page.waitForSelector('.editor-diseno-logo img');
    ok(await page.getByRole('button', { name: 'Cambiar logo del negocio' }).count() === 1, `${t} logo: tras subirlo, el cuadro muestra la imagen y ofrece cambiarla`);
    ok((await page.evaluate(() => window.__llamadas.filter((l) => l[0] === 'logo').length)) === 1, `${t} logo: se llamó a la subida una vez`);
    ok(await page.getByRole('button', { name: 'Guardar' }).isEnabled(), `${t} logo: el cambio activa Guardar`);

    // WhatsApp
    const campo = page.getByRole('textbox', { name: 'Botón de WhatsApp' });
    await campo.fill('+505 8707-40');
    ok(await campo.inputValue() === '505870740', `${t} whatsapp: el campo deja solo dígitos (${await campo.inputValue()})`);
    await campo.fill('1234');
    ok(await page.getByRole('button', { name: 'Guardar' }).isDisabled(), `${t} whatsapp: 4 dígitos -> Guardar desactivado`);
    ok(await page.getByText('Escribe entre 8 y 15 dígitos, solo números.').isVisible(), `${t} whatsapp: aviso de 8 a 15 dígitos`);
    await campo.fill('87074097');
    ok(await page.getByRole('button', { name: 'Guardar' }).isEnabled(), `${t} whatsapp: 8 dígitos -> Guardar activo`);

    // Portada
    await page.setInputFiles('input[data-campo=portada]', { name: 'portada.png', mimeType: 'image/png', buffer: Buffer.from('x') });
    await page.waitForSelector('.editor-diseno-portada-miniatura');
    await page.getByRole('radio', { name: 'Terracota' }).click();
    await page.getByRole('radio', { name: 'Lista' }).click();
    await page.screenshot({ path: path.join(capturas, `diseno_editor_${ancho}.png`), fullPage: true });

    // Deshacer
    await page.getByRole('button', { name: 'Deshacer' }).click();
    ok((await nombres()).join('|') === 'Horarios|Productos|Fotos|Actividades|Reseñas' && await page.locator('.editor-diseno-logo img').count() === 0 && await campo.inputValue() === '', `${t} deshacer: vuelve al último guardado (orden, logo y WhatsApp)`);
    ok(await page.getByRole('button', { name: 'Guardar' }).isDisabled(), `${t} deshacer: Guardar desactivado`);

    // Guardar: siete claves, nada de texto libre
    await page.getByRole('radio', { name: 'Verde' }).click();
    await page.getByRole('switch', { name: 'Mostrar Horarios' }).click();
    await page.setInputFiles('input[data-campo=logo]', { name: 'logo.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('x') });
    await page.waitForSelector('.editor-diseno-logo img');
    await campo.fill('50587074097');
    await desc.fill('Línea uno\nLínea dos');
    await page.getByRole('button', { name: 'Guardar' }).click();
    await page.getByText('Diseño guardado.').waitFor();
    const llamadas = await page.evaluate(() => window.__llamadas);
    const guardada = llamadas.filter((l) => l[0] === 'guardar').pop()[1];
    ok(guardada.logo_url.startsWith('https://spybqychnydgvidwjrlh.supabase.co/storage/v1/object/public/negocios/') && guardada.portada_url === null && Object.keys(guardada).sort().join(',') === 'descripcion,layout_productos,letra,logo_url,paleta,portada_url,secciones_visibles,whatsapp',
      `${t} guardar: envía las ocho claves (logo_url y descripcion incluidas) y nada más -> ${Object.keys(guardada).sort().join(',')}`);
    ok(guardada.descripcion === 'Línea uno\nLínea dos', `${t} guardar: la descripción viaja como texto plano`);
    ok(guardada.paleta === 'verde' && guardada.whatsapp === '50587074097' && guardada.secciones_visibles.join(',') === 'productos,fotos,actividades,resenas', `${t} guardar: valores correctos`);
    ok(await page.getByRole('button', { name: 'Guardar' }).isDisabled(), `${t} guardar: tras guardar, Guardar desactivado`);
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

// Escritorio: una sola columna a todo el ancho
{
  const { ctx, page } = await abrir(1280, 'editor', datos({}), 900);
  await page.waitForSelector('.editor-diseno');
  const medidas = await page.evaluate(() => {
    const editor = document.querySelector('.editor-diseno').getBoundingClientRect();
    const columna = document.querySelector('.perfilnegocio-contenido');
    const estilo = getComputedStyle(columna);
    const util = columna.getBoundingClientRect().width - parseFloat(estilo.paddingLeft) - parseFloat(estilo.paddingRight);
    return { editor: editor.width, util, hijos: document.querySelectorAll('.perfilnegocio-contenido > *').length };
  });
  ok(Math.abs(medidas.editor - medidas.util) < 1 && medidas.hijos === 1, `[1280px] el editor ocupa todo el ancho de la columna del panel (${Math.round(medidas.editor)} de ${Math.round(medidas.util)} px) y no hay segunda columna`);
  await page.screenshot({ path: path.join(capturas, 'diseno_editor_1280.png') });
  await ctx.close();
}

await browser.close();
await servidor.close();
console.log(`\nRESULTADO: ${total - fallas.length} de ${total} comprobaciones correctas${fallas.length ? ` (${fallas.length} FALLAN)` : ''}`);
fallas.forEach((f) => console.log(' - ' + f));
process.exit(fallas.length ? 1 : 0);
