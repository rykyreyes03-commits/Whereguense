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
  negocio: { config_diseno: config, logo_url: null, latitud: 12.4355375908998, longitud: -86.8805694580078 },
  horarios,
  productos: [{ id: 1, nombre: 'Café de altura', orden: 1 }, { id: 2, nombre: 'Cacao', orden: 2 }, { id: 3, nombre: 'Pan dulce', orden: 3 }],
  fotos: [{ url: FOTO }],
  actividades: [{ id: 9, nombre: 'Noche de danza', descripcion: 'Música en vivo', fecha_inicio: '2026-10-17', fecha_fin: '2026-10-18', estado_sello: 'aprobado' }],
});

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});

async function abrir(ancho, vista, db, alto = 900, extra = {}) {
  const ctx = await browser.newContext({
    viewport: { width: ancho, height: alto },
    deviceScaleFactor: 2,
    ...(extra.geo ? { permissions: ['geolocation'], geolocation: extra.geo } : {}),
  });
  // Las imágenes que "sube" el arnés son URLs https del bucket: se responden con un dibujo para que se vean
  await ctx.route('https://spybqychnydgvidwjrlh.supabase.co/**', (ruta) => ruta.fulfill({
    contentType: 'image/svg+xml',
    body: "<svg xmlns='http://www.w3.org/2000/svg' width='600' height='300'><rect width='600' height='300' fill='#d98c3a'/><circle cx='300' cy='150' r='80' fill='#fff3d6'/></svg>",
  }));
  const teselas = [];
  await ctx.route(/basemaps.cartocdn.com/, (ruta) => {
    teselas.push(ruta.request().url());
    return ruta.fulfill({ contentType: 'image/svg+xml', body: "<svg xmlns='http://www.w3.org/2000/svg' width='256' height='256'><rect width='256' height='256' fill='#dfe8d5'/></svg>" });
  });
  const page = await ctx.newPage();
  page.teselas = teselas;
  const errores = [];
  page.on('pageerror', (e) => errores.push(e.message));
  // El reloj se congela para probar "Abierto ahora"; los mapas necesitan el real (las animaciones de Leaflet dependen de Date.now).
  await page.addInitScript(([d, ahora, congelar]) => { window.__db = d; if (congelar) Date.now = () => ahora; }, [db, AHORA, !extra.relojReal]);
  await page.goto(`${base}?vista=${vista}${extra.query ? '&' + extra.query : ''}`);
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
    ok((await titulos(page)).join('|') === 'Horarios|Productos|Fotos|Actividades|Reseñas|Cómo llegar', `${t} defecto: orden Horarios, Productos, Fotos, Actividades, Reseñas, Cómo llegar`);
    const filasHorario = await page.$$eval('.perfilpublico-horarios li', (els) => els.map((e) => [e.children[0].textContent.trim(), e.children[1].textContent.trim()]));
    ok(JSON.stringify(filasHorario) === JSON.stringify([['Lun a Sáb', '8:00 AM – 6:00 PM']]), `${t} horarios: una fila "Lun a Sáb" / "8:00 AM – 6:00 PM" y el domingo cerrado no se muestra -> ${JSON.stringify(filasHorario)}`);
    const li = await page.locator('.perfilpublico-horarios li').first().boundingBox();
    const dias = await page.locator('.perfilpublico-horarios li span').first().boundingBox();
    const horas = await page.locator('.perfilpublico-horarios li strong').first().boundingBox();
    ok(dias.x < horas.x && dias.x - li.x < 4 && Math.abs((horas.x + horas.width) - (li.x + li.width)) < 4, `${t} horarios: días a la izquierda y horas a la derecha`);
    // Cómo llegar
    ok(await page.locator('.minimapa .leaflet-container').count() === 1 && await page.locator('.minimapa .leaflet-marker-icon').count() === 1, `${t} cómo llegar: mini-mapa con un marcador`);
    await page.waitForTimeout(500);
    ok(page.teselas.some((u) => /\/15\/\d+\/\d+/.test(u)), `${t} cómo llegar: el mapa carga teselas de zoom 15 (${page.teselas.length} pedidas)`);
    ok(await page.locator('a[href*="google"]').count() === 0 && await page.getByRole('link', { name: 'Cómo llegar' }).count() === 0, `${t} cómo llegar: ya no hay enlace a Google Maps`);
    ok(await page.getByRole('button', { name: 'Ver en el mapa' }).count() === 0, `${t} cómo llegar: sin manejador (vista previa del dueño) no hay botón "Ver en el mapa"`);
    ok(await page.locator('.minimapa').evaluate((e) => e.getBoundingClientRect().width <= window.innerWidth), `${t} cómo llegar: el mapa cabe en la pantalla`);
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

  // 3g. Ficha con "Ver en el mapa": cierra la ficha y lleva al mapa con el id del negocio
  {
    const { ctx, page } = await abrir(ancho, 'ficha-mapa', datos({}));
    await page.waitForSelector('.minimapa');
    const boton = page.getByRole('button', { name: 'Ver en el mapa' });
    const yMapa = (await page.locator('.minimapa').boundingBox()).y + (await page.locator('.minimapa').boundingBox()).height;
    ok(await boton.isVisible() && (await boton.boundingBox()).y >= yMapa, `${t} ver en el mapa: el botón está debajo del mini-mapa`);
    ok(await page.locator('.minimapa .leaflet-marker-icon').count() === 1 && await page.locator('.minimapa .leaflet-control-zoom').count() === 0, `${t} ver en el mapa: el mini-mapa tiene marcador y no tiene controles de zoom`);
    await boton.click();
    const llamadas = await page.evaluate(() => window.__llamadas);
    ok(JSON.stringify(llamadas) === '[["cerrar"],["ver",1]]', `${t} ver en el mapa: primero cierra la ficha y luego pide el mapa con el id del negocio -> ${JSON.stringify(llamadas)}`);
    await ctx.close();
  }

  // 3e. Horarios con varios grupos: lunes a viernes, sábado solo, domingo cerrado
  {
    const d = datos({});
    d.horarios = [hr(0, null, null, true), ...[1, 2, 3, 4, 5].map((n) => hr(n, '08:00:00', '18:00:00')), hr(6, '09:00:00', '13:00:00')];
    const { ctx, page } = await abrir(ancho, 'ficha', d);
    await page.waitForSelector('.perfilpublico-horarios');
    const filasH = await page.$$eval('.perfilpublico-horarios li', (els) => els.map((e) => [e.children[0].textContent.trim(), e.children[1].textContent.trim()]));
    ok(JSON.stringify(filasH) === JSON.stringify([['Lun a Vie', '8:00 AM – 6:00 PM'], ['Sábado', '9:00 AM – 1:00 PM']]), `${t} horarios: "Lun a Vie" y "Sábado" en filas aparte, sin el domingo cerrado -> ${JSON.stringify(filasH)}`);
    ok(await page.locator('.perfilpublico-horarios li').nth(1).evaluate((e) => getComputedStyle(e).borderTopWidth) === '1px', `${t} horarios: separador entre filas`);
    await ctx.close();
  }

  // 3f. Ubicación: sin coordenadas no hay sección; oculta en el diseño tampoco
  {
    const d = datos({});
    d.negocio.latitud = null;
    d.negocio.longitud = null;
    const { ctx, page } = await abrir(ancho, 'ficha', d);
    await page.waitForSelector('.perfilpublico-nombre');
    await page.waitForSelector('.resenas-seccion');
    ok(!(await titulos(page)).includes('Cómo llegar') && await page.locator('.minimapa').count() === 0, `${t} sin coordenadas: no hay sección Cómo llegar ni mapa`);
    await ctx.close();
  }
  {
    const { ctx, page } = await abrir(ancho, 'ficha', datos({ secciones_visibles: ['horarios', 'resenas'] }));
    await page.waitForSelector('.perfilpublico-nombre');
    await page.waitForSelector('.resenas-seccion');
    ok(!(await titulos(page)).includes('Cómo llegar') && await page.locator('.minimapa').count() === 0, `${t} con coordenadas pero la sección oculta: no se dibuja`);
    await ctx.close();
  }
  {
    const { ctx, page } = await abrir(ancho, 'ficha', datos({ secciones_visibles: ['ubicacion', 'horarios'] }));
    await page.waitForSelector('.minimapa');
    ok((await titulos(page)).join('|') === 'Cómo llegar|Horarios', `${t} la ubicación puede ir primero (orden del diseño) -> ${(await titulos(page)).join('|')}`);
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(capturas, `diseno_ficha_ubicacion_${ancho}.png`) });
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
    ok((await nombres()).join('|') === 'Horarios|Productos|Fotos|Actividades|Reseñas|Ubicación', `${t} secciones: las seis, en el orden por defecto (Ubicación al final)`);
    ok(await page.getByRole('button', { name: 'Subir Horarios' }).count() === 0, `${t} secciones: la primera no tiene ↑`);
    ok(await page.getByRole('button', { name: 'Bajar Ubicación' }).count() === 0, `${t} secciones: la última (Ubicación) no tiene ↓`);
    ok(await page.getByRole('button', { name: 'Bajar Horarios' }).count() === 1 && await page.getByRole('button', { name: 'Subir Reseñas' }).count() === 1, `${t} secciones: las demás flechas sí`);
    ok(await page.getByRole('button', { name: /^Arrastrar / }).count() === 6, `${t} secciones: seis asas de arrastre`);
    ok(await page.locator('.editor-diseno-seccion').nth(1).evaluate((e) => getComputedStyle(e).borderTopWidth) === '1px', `${t} secciones: separador entre filas`);

    await page.getByRole('button', { name: 'Bajar Horarios' }).click();
    ok((await nombres()).join('|') === 'Productos|Horarios|Fotos|Actividades|Reseñas|Ubicación', `${t} secciones: ↓ baja Horarios`);
    await page.getByRole('button', { name: 'Subir Horarios' }).click();
    ok((await nombres()).join('|') === 'Horarios|Productos|Fotos|Actividades|Reseñas|Ubicación', `${t} secciones: ↑ la devuelve`);
    ok(await page.getByRole('button', { name: 'Guardar' }).isDisabled(), `${t} secciones: volver al orden original = sin cambios`);

    // Arrastrar: Reseñas (fila 5) hasta la fila 1
    const asa = await page.getByRole('button', { name: 'Arrastrar Reseñas' }).boundingBox();
    const primera = await page.locator('.editor-diseno-seccion').first().boundingBox();
    await page.mouse.move(asa.x + asa.width / 2, asa.y + asa.height / 2);
    await page.mouse.down();
    await page.mouse.move(asa.x + asa.width / 2, primera.y + 10, { steps: 12 });
    await page.mouse.up();
    ok((await nombres()).join('|') === 'Reseñas|Horarios|Productos|Fotos|Actividades|Ubicación', `${t} secciones: arrastrar Reseñas a la primera fila -> ${(await nombres()).join('|')}`);

    // Ubicación: su toggle y su orden como las demás
    ok(await page.getByRole('switch', { name: 'Mostrar Ubicación' }).getAttribute('aria-checked') === 'true', `${t} ubicación: visible por defecto en el editor`);
    await page.getByRole('switch', { name: 'Mostrar Ubicación' }).click();
    ok(await page.getByRole('switch', { name: 'Mostrar Ubicación' }).getAttribute('aria-checked') === 'false', `${t} ubicación: su toggle la oculta`);
    await page.getByRole('switch', { name: 'Mostrar Ubicación' }).click();
    await page.getByRole('button', { name: 'Subir Ubicación' }).click();
    ok((await nombres()).join('|') === 'Reseñas|Horarios|Productos|Fotos|Ubicación|Actividades', `${t} ubicación: ↑ la sube un lugar -> ${(await nombres()).join('|')}`);
    await page.getByRole('button', { name: 'Bajar Ubicación' }).click();
    ok((await nombres()).join('|') === 'Reseñas|Horarios|Productos|Fotos|Actividades|Ubicación', `${t} ubicación: ↓ la devuelve`);

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
    ok((await nombres()).join('|') === 'Horarios|Productos|Fotos|Actividades|Reseñas|Ubicación' && await page.locator('.editor-diseno-logo img').count() === 0 && await campo.inputValue() === '', `${t} deshacer: vuelve al último guardado (orden, logo y WhatsApp)`);
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
    ok(guardada.paleta === 'verde' && guardada.whatsapp === '50587074097' && guardada.secciones_visibles.join(',') === 'productos,fotos,actividades,resenas,ubicacion', `${t} guardar: valores correctos (incluye ubicacion)`);
    ok(await page.getByRole('button', { name: 'Guardar' }).isDisabled(), `${t} guardar: tras guardar, Guardar desactivado`);
    ok(errores.length === 0, `${t} editor sin errores de página${errores.length ? ': ' + errores[0] : ''}`);
    await ctx.close();
  }

  // 7. Mapa principal: "Ver en el mapa", negocio resaltado y botón "Estoy aquí"
  {
    const negociosMapa = [
      { id: 1, nombre_negocio: 'Café Colibrí', categoria: 'Cafetería', descripcion: 'Café de altura en el centro de León.', telefono: '87074097', latitud: 12.4373, longitud: -86.8767 },
      { id: 2, nombre_negocio: 'Artesanías Sutiaba', categoria: 'Artesanías', descripcion: 'Hamacas y cerámica.', telefono: '88880000', latitud: 12.4355, longitud: -86.8805 },
    ];
    const conMapa = () => ({ ...datos({}), negociosMapa });
    const GEO = { latitude: 12.4392, longitude: -86.8790 };
    const centroX = ancho / 2;
    const xDe = async (loc) => { const b = await loc.boundingBox(); return b.x + b.width / 2; };

    // 7a. Se llega con "Ver en el mapa" al negocio 1 (permiso de ubicación concedido)
    {
      const { ctx, page, errores } = await abrir(ancho, 'mapa', conMapa(), 800, { relojReal: true, query: 'enfocar=1', geo: GEO });
      await page.waitForSelector('.negocio-marcador-resaltado');
      await page.waitForTimeout(4000); // termina el vuelo
      ok(await page.locator('.negocio-marcador-resaltado').count() === 1, `${t} mapa: el negocio al que se llegó tiene el marcador resaltado`);
      ok(await page.locator('.negocio-marcador-icono:not(.negocio-marcador-resaltado)').count() === 1, `${t} mapa: el otro negocio conserva su marcador normal`);
      const caja = await page.locator('.negocio-marcador-resaltado svg').boundingBox();
      ok(caja.width > 30 && caja.height > 45, `${t} mapa: el marcador resaltado es más grande (${Math.round(caja.width)}x${Math.round(caja.height)} frente a 28x36)`);
      ok(Math.abs((await xDe(page.locator('.negocio-marcador-resaltado svg'))) - centroX) < 30, `${t} mapa: el mapa quedó centrado en el negocio`);
      for (let k = 0; k < 40 && !page.teselas.some((u) => /\/17\/\d+\/\d+/.test(u)); k += 1) await page.waitForTimeout(200);
      ok(page.teselas.some((u) => /\/17\/\d+\/\d+/.test(u)), `${t} mapa: acercó a zoom 17`);
      ok(await page.locator('.panel-sitio').count() === 0, `${t} mapa: no se abre el panel que taparía el marcador y el botón`);
      const boton = page.getByRole('button', { name: 'Estoy aquí' });
      ok(await boton.isVisible(), `${t} mapa: el botón flotante "Estoy aquí" está visible`);
      const bb = await boton.boundingBox();
      ok(bb.x + bb.width <= ancho - 8 && bb.x + bb.width >= ancho - 40 && bb.y > 800 / 2, `${t} mapa: el botón está en la esquina inferior derecha (derecha ${Math.round(ancho - bb.x - bb.width)} px, y ${Math.round(bb.y)})`);
      const fab = await page.getByRole('button', { name: 'Centrar en mi ubicación' }).boundingBox();
      ok(bb.y + bb.height <= fab.y, `${t} mapa: no tapa el botón de centrar en mi ubicación`);
      await page.screenshot({ path: path.join(capturas, `mapa_llegada_${ancho}.png`) });

      // "Estoy aquí" con permiso concedido
      ok(await page.locator('.estoy-aqui-icono').count() === 0, `${t} mapa: antes de tocar no hay pin "Estoy aquí"`);
      await boton.click();
      await page.waitForSelector('.estoy-aqui-icono');
      await page.waitForTimeout(4000);
      ok(await page.locator('.estoy-aqui-icono').count() === 1, `${t} estoy aquí: aparece el pin del turista`);
      ok(await page.locator('.estoy-aqui-punto').evaluate((e) => getComputedStyle(e).backgroundColor) === 'rgb(124, 200, 242)', `${t} estoy aquí: el pin es azul claro`);
      ok(await page.locator('.negocio-marcador-icono').count() === 2 && await page.locator('.negocio-marcador-resaltado').count() === 1, `${t} estoy aquí: el pin es distinto de los de negocio y estos siguen donde estaban`);
      ok(await page.locator('.ubicacion-usuario-icono').count() === 0, `${t} estoy aquí: no se duplica con el punto de ubicación de siempre`);
      ok(Math.abs((await xDe(page.locator('.estoy-aqui-punto'))) - centroX) < 30, `${t} estoy aquí: el mapa se centró en el turista`);
      ok(await page.getByRole('status').filter({ hasText: 'Activa la ubicación' }).count() === 0, `${t} estoy aquí: con permiso no hay aviso`);
      await page.screenshot({ path: path.join(capturas, `mapa_estoy_aqui_${ancho}.png`) });

      // salir a otra sección: el botón desaparece; al volver por el menú ya no está
      await page.getByRole('button', { name: 'Volver al inicio' }).click();
      await page.waitForSelector('#otra-seccion');
      ok(await page.getByRole('button', { name: 'Estoy aquí' }).count() === 0, `${t} navegar a otra sección: el botón desaparece`);
      await page.getByRole('button', { name: 'Ir al mapa' }).click();
      await page.waitForSelector('.mapa-mi-ubicacion-btn');
      ok(await page.getByRole('button', { name: 'Estoy aquí' }).count() === 0 && await page.locator('.negocio-marcador-resaltado').count() === 0, `${t} volver al mapa por el menú: sin botón ni resaltado`);
      ok(errores.length === 0, `${t} mapa sin errores de página${errores.length ? ': ' + errores[0] : ''}`);
      await ctx.close();
    }

    // 7b. Permiso de ubicación rechazado
    {
      const { ctx, page } = await abrir(ancho, 'mapa', conMapa(), 800, { relojReal: true, query: 'enfocar=1' });
      await page.waitForSelector('.negocio-marcador-resaltado');
      await page.getByRole('button', { name: 'Estoy aquí' }).click();
      await page.getByRole('status').filter({ hasText: 'Activa la ubicación en tu navegador' }).waitFor();
      ok(true, `${t} estoy aquí: sin permiso se avisa "Activa la ubicación en tu navegador"`);
      ok(await page.locator('.estoy-aqui-icono').count() === 0, `${t} estoy aquí: sin permiso no se pone el pin`);
      ok(await page.getByRole('button', { name: 'Estoy aquí' }).isEnabled(), `${t} estoy aquí: el botón sigue disponible para reintentar`);
      await page.waitForTimeout(5000);
      ok(await page.getByRole('status').filter({ hasText: 'Activa la ubicación' }).count() === 0, `${t} estoy aquí: el aviso es corto y se quita solo`);
      await ctx.close();
    }

    // 7c. Mapa normal (sin "Ver en el mapa"): sin botón ni resaltado
    {
      const { ctx, page } = await abrir(ancho, 'mapa', conMapa(), 800, { relojReal: true, geo: GEO });
      await page.waitForSelector('.negocio-marcador-icono');
      await page.waitForTimeout(500);
      ok(await page.getByRole('button', { name: 'Estoy aquí' }).count() === 0 && await page.locator('.negocio-marcador-resaltado').count() === 0, `${t} mapa normal: sin botón "Estoy aquí" ni marcador resaltado`);
      ok(await page.getByRole('button', { name: 'Centrar en mi ubicación' }).count() === 1, `${t} mapa normal: el botón de siempre sigue`);

      // 7d. Desde la ficha dentro del mapa: Perfil de negocio -> Ver en el mapa
      await page.locator('.negocio-marcador-icono').first().dispatchEvent('click'); // el punto de ubicación del turista se superpone
      await page.getByRole('button', { name: 'Perfil de negocio' }).click();
      await page.waitForSelector('.perfilpublico-ficha');
      await page.waitForSelector('.minimapa');
      await page.getByRole('button', { name: 'Ver en el mapa' }).click();
      await page.waitForSelector('.negocio-marcador-resaltado');
      ok(await page.locator('.perfilpublico-ficha').count() === 0, `${t} ficha en el mapa: "Ver en el mapa" cierra la ficha`);
      ok(await page.locator('.negocio-marcador-resaltado').count() === 1, `${t} ficha en el mapa: el negocio queda resaltado`);
      ok(await page.getByRole('button', { name: 'Estoy aquí' }).isVisible(), `${t} ficha en el mapa: aparece "Estoy aquí"`);
      await ctx.close();
    }

    // 7e. Negocio que ya no está en el mapa
    {
      const { ctx, page } = await abrir(ancho, 'mapa', conMapa(), 800, { relojReal: true, query: 'enfocar=99' });
      await page.getByRole('status').filter({ hasText: 'Este negocio no está en el mapa por ahora.' }).waitFor();
      ok(await page.locator('.negocio-marcador-resaltado').count() === 0, `${t} negocio fuera del mapa: se avisa y no se resalta nada`);
      await ctx.close();
    }
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
