// Pruebas del 2FA opcional en Perfil: el acceso "Verificación en dos pasos" (activada / no activada), su acción y el botón
// "Ahora no, volver" de MfaEnrolamiento. (Que quien no tiene 2FA entre directo a la app es lógica de App.jsx: ver el reporte.)
// Uso (desde la raíz del proyecto):  node docs/tests/sitio_front/mfa.test.mjs   (requiere playwright; CHROMIUM_PATH opcional)
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

async function abrir(query, lang = 'es') {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 900 }, locale: 'es-ES', deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  const errores = [];
  page.on('pageerror', (e) => errores.push(e.message));
  await page.addInitScript(() => { window.__db = { uid: 'yo', sesion: true, llamadas: [], fotos: [], resenas: [] }; window.__eventos = []; });
  await page.goto(`${base}?vista=perfil&lang=${lang}${query}`);
  await page.waitForSelector('.perfil-acciones');
  return { ctx, page, errores };
}

// ---------- sin 2FA: se ofrece activarlo ----------
{
  const { ctx, page, errores } = await abrir('');
  const fila = page.locator('button.perfil-seguridad');
  ok((await fila.count()) === 1, 'sin 2FA: el acceso a "Verificación en dos pasos" es un botón');
  const txt = (await fila.innerText()).replace(/\s+/g, ' ');
  ok(txt.includes('Verificación en dos pasos') && txt.includes('No activada · Toca para activar'), `sin 2FA: dice "No activada · Toca para activar" (${txt})`);
  ok((await fila.boundingBox()).height >= 44 && (await fila.locator('h2, p').count()) === 0, 'sin 2FA: mide al menos 44 px y no mete títulos ni párrafos dentro del botón');
  await page.screenshot({ path: path.join(capturas, 'perfil_2fa_inactivo.png'), fullPage: true });
  await fila.click();
  ok(JSON.stringify(await page.evaluate(() => window.__eventos)) === '[["ir","mfaEnrolamiento"]]', 'sin 2FA: tocar el acceso llama a onActivar2FA');
  ok(errores.length === 0, `sin errores de página (${errores.join('; ')})`);
  await ctx.close();
}

// ---------- con 2FA: se muestra como activada y no hay nada que tocar ----------
{
  const { ctx, page } = await abrir('&mfa=1');
  ok((await page.locator('button.perfil-seguridad').count()) === 0, 'con 2FA: ya no hay botón para activarlo');
  const txt = (await page.locator('.perfil-seguridad--activa').innerText()).replace(/\s+/g, ' ');
  ok(txt.includes('Verificación en dos pasos') && txt.includes('Activada'), `con 2FA: dice "Activada" (${txt})`);
  await page.screenshot({ path: path.join(capturas, 'perfil_2fa_activo.png'), fullPage: true });
  await ctx.close();
}

// ---------- el acceso no aparece sin la acción (invitado) ----------
{
  const { ctx, page } = await abrir('&sin2fa=1');
  ok((await page.locator('.perfil-seguridad').count()) === 0, 'sin la función de activar (invitado): no se muestra la fila');
  await ctx.close();
}

// ---------- en inglés ----------
{
  const { ctx, page } = await abrir('', 'en');
  const txt = (await page.locator('button.perfil-seguridad').innerText()).replace(/\s+/g, ' ');
  ok(txt.includes('Two-step verification') && txt.includes('Off · Tap to turn on'), `en: textos en inglés (${txt})`);
  await ctx.close();
}

await browser.close();
await servidor.close();
console.log(`\n${total - fallas.length}/${total} comprobaciones`);
if (fallas.length) { console.log('FALLAS:\n' + fallas.join('\n')); process.exit(1); }
