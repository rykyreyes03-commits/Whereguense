// Prueba de la interfaz de reseñas (turista, emprendedor, admin) con Supabase simulado, a 360 y 412 px.
// Uso (desde la raíz del proyecto):  node docs/tests/resenas_front/prueba.mjs
// Requiere playwright (npm i --no-save playwright) y su navegador (npx playwright install chromium; o CHROMIUM_PATH=ruta/al/ejecutable).
import { createServer } from 'vite';
import { chromium } from 'playwright';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const servidor = await createServer({ configFile: path.join(aqui, 'vite.config.mjs') });
await servidor.listen();
const base = 'http://localhost:5199/';
const capturas = process.env.CAPTURAS || path.join(os.homedir(), 'Downloads');

let total = 0;
const fallas = [];
const ok = (cond, texto) => { total += 1; if (!cond) fallas.push(texto); console.log(`${cond ? 'OK   ' : 'FALLA'} ${texto}`); };

const R = (id, usuario, cal, texto, extra = {}) => ({ id, negocio_id: 1, negocio: 'Café Colibrí', usuario_id: usuario, autor: 'Viajero',
  calificacion: cal, comentario: texto, fecha: `2026-10-0${id}T10:00:00Z`, ...extra });

const estado = (extra = {}) => ({
  uid: 'yo', sesion: true, puede: false, llamadas: [],
  resenas: [
    R(1, 'a', 5, 'Muy buena atención y el café de altura es increíble.'),
    R(2, 'b', 4, 'Lindo lugar, un poco lleno el sábado.', { respuesta: 'Gracias por venir, abrimos una segunda barra.', fecha_respuesta: '2026-10-03T09:00:00Z' }),
    R(3, 'c', 3, 'Estaba bien, tardaron en atender la mesa.'),
  ],
  tablas: {}, ...extra,
});

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});

async function abrir(ancho, vista, db) {
  const ctx = await browser.newContext({ viewport: { width: ancho, height: 800 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  const errores = [];
  page.on('pageerror', (e) => errores.push(e.message));
  await page.addInitScript((d) => { window.__db = d; }, db);
  await page.goto(`${base}?vista=${vista}`);
  return { ctx, page, errores };
}

// Contraste WCAG entre dos colores #rrggbb
const lum = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contraste = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
ok(contraste('#9A5B00', '#FFFFFF') >= 4.5, `estrella llena #9A5B00 sobre blanco: ${contraste('#9A5B00', '#FFFFFF').toFixed(2)}:1 (mín. 4.5)`);
ok(contraste('#6B6B80', '#FFFFFF') >= 4.5, `estrella vacía #6B6B80 sobre blanco: ${contraste('#6B6B80', '#FFFFFF').toFixed(2)}:1 (mín. 4.5)`);
ok(contraste('#A81F22', '#FFFFFF') >= 4.5, `texto de error #A81F22 sobre blanco: ${contraste('#A81F22', '#FFFFFF').toFixed(2)}:1`);
ok(contraste('#FFFFFF', '#1E2A78') >= 4.5, `botón principal blanco sobre #1E2A78: ${contraste('#FFFFFF', '#1E2A78').toFixed(2)}:1`);

for (const ancho of [360, 412]) {
  const t = `[${ancho}px]`;

  // 1. Turista sin sello: resumen, lista con respuesta, aviso y sin botón
  {
    const { ctx, page, errores } = await abrir(ancho, 'publico', estado({ puede: false }));
    await page.getByRole('heading', { name: 'Reseñas' }).waitFor();
    ok(await page.getByText('4', { exact: true }).first().isVisible(), `${t} promedio 4 visible`);
    ok(await page.getByText('· 3 reseñas').isVisible(), `${t} "· 3 reseñas"`);
    ok(await page.getByRole('img', { name: '4 de 5 estrellas' }).first().isVisible(), `${t} estrellas con texto accesible "4 de 5 estrellas"`);
    ok(await page.getByText('Respuesta del negocio').isVisible(), `${t} se ve la respuesta del negocio`);
    const orden = await page.locator('.resenas-item-texto').allTextContents();
    ok(orden[0].startsWith('Estaba bien') && orden[2].startsWith('Muy buena'), `${t} la más reciente primero`);
    ok(await page.getByText('Escanea el sello de este negocio para poder dejar tu reseña.').isVisible(), `${t} aviso "Escanea el sello..."`);
    ok(await page.getByRole('button', { name: 'Escribir reseña' }).count() === 0, `${t} sin botón de escribir si no tiene sello`);
    ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `${t} sin scroll horizontal`);
    ok(errores.length === 0, `${t} sin errores de página`);
    await page.screenshot({ path: path.join(capturas, `capturas_resenas_publico_${ancho}.png`), fullPage: true });
    await ctx.close();
  }

  // 2. Turista con sello: escribir reseña con teclado, validaciones, publicar, editar
  {
    const db = estado({ puede: true, resenas: estado().resenas });
    const { ctx, page } = await abrir(ancho, 'publico', db);
    await page.getByRole('button', { name: 'Escribir reseña' }).click();
    const dialogo = page.getByRole('dialog', { name: 'Escribir reseña' });
    await dialogo.waitFor();
    ok(await page.getByText('Escanea el sello').count() === 0, `${t} con sello no sale el aviso`);
    const grupo = dialogo.getByRole('radiogroup', { name: 'Tu calificación' });
    ok(await grupo.getByRole('radio').count() === 5, `${t} cinco estrellas como botones de opción`);
    ok(await grupo.getByRole('radio').first().getAttribute('tabindex') === '0', `${t} Tab entra al grupo por la primera estrella`);
    const medida = await grupo.getByRole('radio').first().boundingBox();
    ok(medida.width >= 44 && medida.height >= 44, `${t} cada estrella mide ${medida.width}x${medida.height} (mín. 44)`);

    // Sin nada: avisa
    await dialogo.getByRole('button', { name: 'Publicar reseña' }).click({ force: true });
    ok(await dialogo.getByRole('alert').textContent() === 'Elige de 1 a 5 estrellas.', `${t} sin estrellas: "Elige de 1 a 5 estrellas."`);

    // Teclado: foco en la primera, flecha derecha x3 = 4 estrellas
    await grupo.getByRole('radio').first().focus();
    for (let i = 0; i < 4; i += 1) await page.keyboard.press('ArrowRight');
    ok(await grupo.getByRole('radio', { name: '5 estrellas' }).getAttribute('aria-checked') === 'true', `${t} con el teclado llega a 5 estrellas (primera + 4 flechas)`);
    await page.keyboard.press('ArrowLeft');
    ok(await grupo.getByRole('radio', { name: '4 estrellas' }).getAttribute('aria-checked') === 'true', `${t} flecha izquierda baja a 4`);
    ok(await page.evaluate(() => document.activeElement.getAttribute('aria-label')) === '4 estrellas', `${t} el foco sigue a la estrella elegida`);

    // Comentario corto
    await dialogo.getByLabel('Tu comentario').fill('corto');
    await dialogo.getByRole('button', { name: 'Publicar reseña' }).click({ force: true });
    ok((await dialogo.getByRole('alert').textContent()).includes('al menos 10 caracteres'), `${t} comentario corto: pide 10 caracteres`);
    ok((await dialogo.locator('#resenas-comentario-ayuda').textContent()).includes('5 de 10'), `${t} contador "5 de 10"`);
    await page.screenshot({ path: path.join(capturas, `capturas_resenas_formulario_${ancho}.png`) });

    // Publicar
    await dialogo.getByLabel('Tu comentario').fill('Probé el café de altura y me encantó la atención.');
    await dialogo.getByRole('button', { name: 'Publicar reseña' }).click({ force: true });
    await dialogo.waitFor({ state: 'detached' });
    ok(db.resenas.length === 4 || (await page.evaluate(() => window.__db.resenas.length)) === 4, `${t} la reseña se guardó`);
    ok(await page.getByText('Tú ·').isVisible(), `${t} aparece marcada como "Tú"`);
    ok(await page.getByText('· 4 reseñas').isVisible(), `${t} el total sube a 4`);
    ok(await page.getByRole('button', { name: 'Editar mi reseña' }).isVisible(), `${t} ahora dice "Editar mi reseña"`);
    ok(await page.getByRole('button', { name: 'Escribir reseña' }).count() === 0, `${t} ya no ofrece escribir otra`);

    // Editar: llega con lo anterior
    await page.getByRole('button', { name: 'Editar mi reseña' }).click();
    const edicion = page.getByRole('dialog', { name: 'Editar mi reseña' });
    ok(await edicion.getByLabel('Tu comentario').inputValue() === 'Probé el café de altura y me encantó la atención.', `${t} editar trae el comentario anterior`);
    ok(await edicion.getByRole('radio', { name: '4 estrellas' }).getAttribute('aria-checked') === 'true', `${t} editar trae las estrellas anteriores`);
    await page.keyboard.press('Escape');
    await edicion.waitFor({ state: 'detached' });
    ok(await page.getByRole('button', { name: 'Editar mi reseña' }).evaluate((b) => document.activeElement === b), `${t} al cerrar, el foco vuelve al botón`);
    await ctx.close();
  }

  // 3. Error del servidor se muestra dentro del formulario
  {
    const { ctx, page } = await abrir(ancho, 'publico', estado({ puede: true, falla: 'guardar' }));
    await page.getByRole('button', { name: 'Escribir reseña' }).click();
    const dialogo = page.getByRole('dialog', { name: 'Escribir reseña' });
    await dialogo.getByRole('radio', { name: '3 estrellas' }).click();
    await dialogo.getByLabel('Tu comentario').fill('Un comentario suficientemente largo.');
    await dialogo.getByRole('button', { name: 'Publicar reseña' }).click({ force: true });
    await dialogo.getByRole('alert').waitFor();
    ok((await dialogo.getByRole('alert').textContent()).startsWith('Escanea el sello'), `${t} el motivo del servidor se muestra y el formulario sigue abierto`);
    await ctx.close();
  }

  // 4. Dueño mirando su ficha (vista previa) y visitante sin sesión: ni botón ni aviso
  for (const [vista, extra, nombre] of [['vistaPrevia', { puede: false }, 'dueño en vista previa'], ['publico', { sesion: false }, 'visitante sin sesión']]) {
    const { ctx, page } = await abrir(ancho, vista, estado(extra));
    await page.getByRole('heading', { name: 'Reseñas' }).waitFor();
    ok(await page.getByRole('button', { name: /reseña/i }).count() === 0 && await page.getByText('Escanea el sello').count() === 0,
      `${t} ${nombre}: sin botón ni aviso`);
    ok(await page.locator('.resenas-item').count() === 3, `${t} ${nombre}: igual ve las reseñas`);
    await ctx.close();
  }

  // 5. Negocio sin reseñas
  {
    const { ctx, page } = await abrir(ancho, 'publico', estado({ resenas: [] }));
    await page.getByText('Aún sin reseñas').waitFor();
    ok(await page.locator('.resenas-item').count() === 0, `${t} sin reseñas: "Aún sin reseñas" y sin lista`);
    await ctx.close();
  }

  // 6. Línea compacta
  {
    const { ctx, page } = await abrir(ancho, 'linea', estado());
    await page.locator('.resenas-linea').waitFor();
    ok((await page.locator('.resenas-linea').textContent()).replace(/\s+/g, ' ').trim() === '4·3 reseñas', `${t} línea "★ 4 · 3 reseñas"`);
    await ctx.close();
  }

  // 7. Emprendedor: resumen con barras, responder y editar respuesta
  {
    const { ctx, page } = await abrir(ancho, 'panel', estado());
    await page.getByLabel('Resumen de reseñas').waitFor();
    ok(await page.locator('.resenas-barra').count() === 5, `${t} una barra por estrella`);
    const anchos = await page.locator('.resenas-barra-relleno').evaluateAll((n) => n.map((e) => e.style.width));
    const pct = anchos.map((w) => Math.round(parseFloat(w)));
    ok(pct.join(',') === '0,0,33,33,33'.split(',').reverse().join(',') || pct.join(',') === '33,33,33,0,0', `${t} barras proporcionales, de 5 a 1 estrella (${anchos.join(', ')})`);
    ok((await page.getByText('Responder', { exact: true }).count()) === 2 && (await page.getByText('Editar respuesta').count()) === 1, `${t} "Responder" en las que no tienen y "Editar respuesta" en la que sí`);
    await page.screenshot({ path: path.join(capturas, `capturas_resenas_emprendedor_${ancho}.png`), fullPage: true });
    await page.getByRole('button', { name: 'Responder' }).first().click();
    const dlg = page.getByRole('dialog', { name: 'Responder reseña' });
    await dlg.getByRole('button', { name: 'Publicar respuesta' }).click({ force: true });
    ok(await dlg.getByRole('alert').count() === 0 && await dlg.getByRole('button', { name: 'Publicar respuesta' }).getAttribute('aria-disabled') === 'true', `${t} respuesta vacía: botón apagado`);
    await dlg.getByLabel('Tu respuesta').fill('Gracias por tu visita, te esperamos pronto.');
    await dlg.getByRole('button', { name: 'Publicar respuesta' }).click({ force: true });
    await dlg.waitFor({ state: 'detached' });
    ok(await page.getByText('Gracias por tu visita, te esperamos pronto.').isVisible(), `${t} la respuesta aparece publicada`);
    ok(await page.getByText('Editar respuesta').count() === 2, `${t} esa reseña pasa a "Editar respuesta"`);
    await ctx.close();
  }

  // 8. Emprendedor sin reseñas
  {
    const { ctx, page } = await abrir(ancho, 'panel', estado({ resenas: [] }));
    await page.getByText('Aún no tienes reseñas.', { exact: false }).waitFor();
    ok(true, `${t} pestaña sin reseñas: mensaje vacío`);
    await ctx.close();
  }

  // 9. Admin: sello de actividad terminada, reseñas con filtro y eliminar con confirmación
  {
    const sol = (id, nombre, fin) => ({ id, nombre, descripcion: 'Descripción', foto_url: null, limite_canjes: 10, fecha_inicio: '2020-01-01', fecha_fin: fin,
      hora_inicio: '10:00:00', hora_fin: '12:00:00', justificacion_sello: 'Para visitantes', fecha_creacion: '2026-10-01T10:00:00Z',
      negocio: { nombre_negocio: 'Café Colibrí', usuario_id: 'otro' } });
    const db = estado({
      tablas: { actividad_negocio: [sol(10, 'Feria vieja', '2020-01-02'), sol(11, 'Feria futura', '2099-01-02')] },
      resenas: [...estado().resenas, R(4, 'd', 2, 'No me gustó para nada.', { negocio_id: 2, negocio: 'Bazar Sol' })],
    });
    const { ctx, page } = await abrir(ancho, 'admin', db);
    await page.getByText('Feria vieja').waitFor();
    const tarjetaVieja = page.locator('.panelAdmin-card', { hasText: 'Feria vieja' });
    const tarjetaFutura = page.locator('.panelAdmin-card', { hasText: 'Feria futura' });
    ok(await tarjetaVieja.getByText('Ya terminó', { exact: true }).isVisible(), `${t} solicitud de actividad terminada: etiqueta "Ya terminó"`);
    ok(await tarjetaVieja.getByRole('button', { name: 'Aprobar' }).isDisabled(), `${t} su Aprobar está desactivado`);
    ok(await tarjetaVieja.getByText('Esta actividad ya terminó: su sello nacería vencido. Puedes rechazar la solicitud.').isVisible(), `${t} con su explicación`);
    ok(await tarjetaVieja.getByRole('button', { name: 'Rechazar' }).isEnabled(), `${t} Rechazar sigue activo`);
    ok(await tarjetaFutura.getByText('Ya terminó', { exact: true }).count() === 0 && await tarjetaFutura.getByRole('button', { name: 'Aprobar' }).isEnabled(), `${t} una vigente no lleva etiqueta y se puede aprobar`);

    await page.getByRole('heading', { name: 'Reseñas' }).scrollIntoViewIfNeeded();
    ok(await page.locator('.panelAdmin-card', { hasText: 'Café Colibrí' }).filter({ hasText: 'Viajero' }).count() === 3, `${t} sin filtro, se ven las reseñas de los dos negocios`);
    await page.getByLabel('Negocio').selectOption({ label: 'Bazar Sol' });
    ok(await page.locator('.panelAdmin-card', { hasText: 'No me gustó' }).count() === 1 && await page.locator('.panelAdmin-card', { hasText: 'Muy buena atención' }).count() === 0, `${t} el filtro deja solo las de Bazar Sol`);
    await page.screenshot({ path: path.join(capturas, `capturas_resenas_admin_${ancho}.png`), fullPage: true });
    await page.getByRole('button', { name: 'Eliminar' }).click();
    const conf = page.getByRole('alertdialog');
    ok((await conf.textContent()).includes('Bazar Sol') && (await conf.textContent()).includes('No se puede deshacer'), `${t} confirmación con negocio y advertencia`);
    await conf.getByRole('button', { name: 'Conservarla' }).click();
    ok((await page.evaluate(() => window.__db.resenas.length)) === 4, `${t} "Conservarla" no borra nada`);
    await page.getByRole('button', { name: 'Eliminar' }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Eliminar reseña' }).click();
    await page.getByRole('alertdialog').waitFor({ state: 'detached' });
    ok((await page.evaluate(() => window.__db.resenas.length)) === 3 && await page.getByText('No me gustó').count() === 0, `${t} "Eliminar reseña" la borra y desaparece de la lista`);
    await ctx.close();
  }
}

await browser.close();
await servidor.close();
console.log(`\n${total - fallas.length} de ${total} comprobaciones correctas${fallas.length ? `\nFALLAN:\n- ${fallas.join('\n- ')}` : ''}`);
process.exit(fallas.length ? 1 : 0);
