// Pruebas del login con correo y contraseña (Login.jsx): entrar, crear cuenta, errores y que ya no quede nada del código OTP.
// Uso (desde la raíz del proyecto):  node docs/tests/sitio_front/login.test.mjs   (requiere playwright; CHROMIUM_PATH opcional)
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

async function abrir(auth = null) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 900 }, locale: 'es-ES', deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  const errores = [];
  page.on('pageerror', (e) => errores.push(e.message));
  await page.addInitScript((a) => { window.__db = { uid: 'yo', sesion: false, llamadas: [], fotos: [], resenas: [], auth: a }; }, auth);
  await page.goto(`${base}?vista=login&lang=es`);
  await page.waitForSelector('#login-email');
  await page.waitForTimeout(300);
  return { ctx, page, errores };
}
const llamadas = (page) => page.evaluate(() => window.__db.llamadas);
const error = async (page) => (await page.locator('.login-form-error').textContent().catch(() => null));

// ---------- entrar ----------
{
  const { ctx, page, errores } = await abrir();
  const texto = await page.locator('.login-wrapper').innerText();
  ok(!/código|codigo|Verificar|Reenviar|Cambiar correo/i.test(texto) && (await page.locator('input[inputmode=numeric], input[autocomplete=one-time-code]').count()) === 0, 'sin rastro del código de 6 dígitos ni del enlace mágico');
  ok((await page.locator('#login-email').getAttribute('type')) === 'email' && (await page.locator('#login-clave').getAttribute('type')) === 'password' && (await page.locator('#login-confirmar').count()) === 0, 'entrar: campos de correo y contraseña (sin confirmar)');
  ok((await page.locator('#login-clave').getAttribute('autocomplete')) === 'current-password' && (await page.locator('.login-form-btn').innerText()).trim() === 'Iniciar sesión', 'entrar: botón "Iniciar sesión" y autocompletado de contraseña actual');
  ok((await page.locator('.login-form-hint').textContent()) === '¿Entraste con Google la última vez? Usa el botón de arriba.', 'entrar: se ve el recordatorio de entrar con Google');
  await page.screenshot({ path: path.join(capturas, 'login_entrar.png') });

  await page.locator('.login-form-btn').click();
  ok((await error(page)) === 'Escribe tu correo.' && (await llamadas(page)).length === 0, 'entrar: sin correo no llama a Supabase');
  await page.fill('#login-email', '  ryky@correo.com ');
  await page.locator('.login-form-btn').click();
  ok((await error(page)) === 'Escribe tu contraseña.' && (await llamadas(page)).length === 0, 'entrar: sin contraseña no llama a Supabase');
  await page.fill('#login-clave', 'secreto1');
  await page.locator('.login-form-btn').click();
  await page.waitForTimeout(200);
  const l = await llamadas(page);
  ok(l.length === 1 && l[0][0] === 'signIn' && l[0][1].email === 'ryky@correo.com' && l[0][1].password === 'secreto1', 'entrar: llama a signInWithPassword con el correo (sin espacios) y la contraseña');
  ok((await error(page)) === null, 'entrar: con éxito no muestra error (App.jsx sigue por onAuthStateChange)');
  ok(errores.length === 0, `entrar: sin errores de página (${errores.join('; ')})`);
  await ctx.close();
}

// ---------- errores al entrar ----------
for (const [mensaje, esperado, nombre] of [
  ['Invalid login credentials', 'Correo o contraseña incorrectos. Si creaste tu cuenta con Google, usa el botón "Continuar con Google".', 'credenciales malas (o cuenta de Google)'],
  ['Email not confirmed', 'Confirma tu correo antes de iniciar sesión: te enviamos un mensaje al registrarte.', 'correo sin confirmar'],
  ['Email rate limit exceeded', 'Demasiados intentos. Espera unos minutos e intenta de nuevo.', 'límite de intentos'],
]) {
  const { ctx, page } = await abrir({ signIn: { data: {}, error: { message: mensaje } } });
  await page.fill('#login-email', 'a@b.com'); await page.fill('#login-clave', 'x');
  await page.locator('.login-form-btn').click();
  await page.waitForTimeout(200);
  ok((await error(page)) === esperado && (await page.locator('#login-clave').inputValue()) === 'x', `entrar: ${nombre} -> "${esperado}" (y no borra lo escrito)`);
  await ctx.close();
}

// ---------- crear cuenta ----------
{
  const { ctx, page } = await abrir();
  await page.getByRole('button', { name: 'Crea una' }).click();
  ok((await page.locator('#login-confirmar').count()) === 1 && (await page.locator('.login-form-btn').innerText()).trim() === 'Crear cuenta' && (await page.locator('#login-clave').getAttribute('autocomplete')) === 'new-password', 'crear: aparece "Confirmar contraseña" y el botón "Crear cuenta"');
  ok((await page.getByRole('button', { name: 'Inicia sesión' }).count()) === 1, 'crear: el enlace de abajo pasa a "Inicia sesión"');
  ok((await page.locator('.login-form-hint').count()) === 0, 'crear: el recordatorio de Google NO aparece en "Crear cuenta"');
  await page.screenshot({ path: path.join(capturas, 'login_crear.png') });
  await page.fill('#login-email', 'nueva@correo.com');
  await page.fill('#login-clave', '123'); await page.fill('#login-confirmar', '123');
  await page.locator('.login-form-btn').click();
  ok((await error(page)) === 'La contraseña debe tener al menos 6 caracteres.' && (await llamadas(page)).length === 0, 'crear: contraseña de menos de 6 caracteres se rechaza');
  await page.fill('#login-clave', 'secreto1'); await page.fill('#login-confirmar', 'secreto2');
  await page.locator('.login-form-btn').click();
  ok((await error(page)) === 'Las contraseñas no coinciden.' && (await llamadas(page)).length === 0, 'crear: contraseñas distintas se rechazan');
  await page.fill('#login-confirmar', 'secreto1');
  await page.locator('.login-form-btn').click();
  await page.waitForTimeout(200);
  const l = await llamadas(page);
  ok(l.length === 1 && l[0][0] === 'signUp' && l[0][1].email === 'nueva@correo.com' && l[0][1].password === 'secreto1' && typeof l[0][1].options.emailRedirectTo === 'string', 'crear: llama a signUp con correo y contraseña (y a dónde vuelve el correo de confirmación)');
  ok((await page.locator('.login-form-aviso').count()) === 0, 'crear: si Supabase abre la sesión, no hay aviso (la app sigue sola)');
  await page.getByRole('button', { name: 'Inicia sesión' }).click();
  ok((await page.locator('#login-confirmar').count()) === 0 && (await page.locator('#login-clave').inputValue()) === '', 'volver a entrar: se quita la confirmación y se limpian las contraseñas');
  await ctx.close();
}
{
  // el proyecto exige confirmar el correo: signUp responde sin sesión
  const { ctx, page } = await abrir({ signUp: { data: { user: { identities: [{ id: 1 }] }, session: null }, error: null } });
  await page.getByRole('button', { name: 'Crea una' }).click();
  await page.fill('#login-email', 'nueva@correo.com'); await page.fill('#login-clave', 'secreto1'); await page.fill('#login-confirmar', 'secreto1');
  await page.locator('.login-form-btn').click();
  await page.waitForTimeout(250);
  ok((await page.locator('.login-form-aviso').textContent()).includes('nueva@correo.com') && (await page.locator('#login-confirmar').count()) === 0, 'crear con confirmación de correo: avisa que revise el correo y vuelve a "Iniciar sesión"');
  await ctx.close();
}
{
  // correo que ya tiene cuenta
  const { ctx, page } = await abrir({ signUp: { data: { user: { identities: [] }, session: null }, error: null } });
  await page.getByRole('button', { name: 'Crea una' }).click();
  await page.fill('#login-email', 'vieja@correo.com'); await page.fill('#login-clave', 'secreto1'); await page.fill('#login-confirmar', 'secreto1');
  await page.locator('.login-form-btn').click();
  await page.waitForTimeout(250);
  ok((await error(page)) === 'Ese correo ya tiene una cuenta. Inicia sesión.' && (await page.locator('#login-confirmar').count()) === 1, 'crear con un correo que ya existe: "Ese correo ya tiene una cuenta"');
  await ctx.close();
}
{
  const { ctx, page } = await abrir({ signUp: { data: {}, error: { message: 'User already registered' } } });
  await page.getByRole('button', { name: 'Crea una' }).click();
  await page.fill('#login-email', 'vieja@correo.com'); await page.fill('#login-clave', 'secreto1'); await page.fill('#login-confirmar', 'secreto1');
  await page.locator('.login-form-btn').click();
  await page.waitForTimeout(250);
  ok((await error(page)) === 'Ese correo ya tiene una cuenta. Inicia sesión.', 'crear: "User already registered" se traduce');
  await ctx.close();
}

// ---------- Google ----------
{
  const { ctx, page } = await abrir();
  const dialogos = [];
  page.on('dialog', (d) => { dialogos.push(d.message()); d.dismiss(); });
  await page.getByRole('button', { name: 'Continuar con Google' }).click();
  await page.waitForTimeout(200);
  const l = await llamadas(page);
  const url = await page.evaluate(() => window.location.origin + window.location.pathname);
  ok(dialogos.length === 0, 'Google: ya no muestra el aviso "próximamente"');
  ok(l.length === 1 && l[0][0] === 'oauth' && l[0][1].provider === 'google' && l[0][1].options.redirectTo === url, `Google: signInWithOAuth con provider google y redirectTo a esta misma página (${l[0]?.[1]?.options?.redirectTo})`);
  ok((await error(page)) === null, 'Google: sin error si Supabase acepta (el navegador sigue a Google)');
  ok(await page.getByRole('button', { name: 'Continuar con Google' }).isDisabled(), 'Google: el botón queda apagado mientras redirige (no se pulsa dos veces)');
  await ctx.close();
}
{
  const { ctx, page } = await abrir({ oauth: { data: {}, error: { message: 'Unsupported provider: provider is not enabled' } } });
  await page.getByRole('button', { name: 'Continuar con Google' }).click();
  await page.waitForTimeout(200);
  ok((await error(page)) === 'Unsupported provider: provider is not enabled' && !(await page.getByRole('button', { name: 'Continuar con Google' }).isDisabled()), 'Google: si Supabase falla, muestra el error y deja volver a intentar');
  await ctx.close();
}

// ---------- lo demás de la pantalla sigue ----------
{
  const { ctx, page } = await abrir();
  ok((await page.locator('text=/invitado/i').count()) === 0 && (await page.locator('.login-btn-invitado').count()) === 0, 'ya no hay "Continuar como invitado"');
  ok((await page.locator('text=Continuar con Google').count()) === 1 && (await page.locator('.login-separador').innerText()).includes('o con tu correo'), 'sigue "Continuar con Google", y debajo "o con tu correo"');
  const alto = await page.locator('.login-form-link').boundingBox();
  ok(alto.height >= 44, 'el enlace "Crea una" mide al menos 44 px de alto');
  await ctx.close();
}

await browser.close();
await servidor.close();
console.log(`\n${total - fallas.length}/${total} comprobaciones`);
if (fallas.length) { console.log('FALLAS:\n' + fallas.join('\n')); process.exit(1); }
