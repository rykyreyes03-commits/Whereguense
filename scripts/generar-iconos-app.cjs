// Genera los íconos de la app (PWA, favicon, apple-touch y fuentes de Android) a partir de src/assets/logo_icono.png
// (la W con el pin, oscura sobre fondo transparente, por eso todos los íconos llevan fondo blanco).
//
// Uso:  node scripts/generar-iconos-app.cjs
// Para Android, después:  npx capacitor-assets generate --android --iconBackgroundColor "#FFFFFF" --splashBackgroundColor "#1E2A78"
//                         node scripts/regenerar-iconos-adaptativos.cjs
const path = require('path');
const sharp = require('sharp');

const raiz = path.join(__dirname, '..');
const origen = path.join(raiz, 'src', 'assets', 'logo_icono.png');
const BLANCO = { r: 255, g: 255, b: 255, alpha: 1 };

// El logo recortado a su contenido (sin los márgenes transparentes del original)
async function logoRecortado() {
  return sharp(origen).trim({ threshold: 5 }).png().toBuffer();
}

// Lienzo de `tam` px con el logo centrado, ocupando como máximo `fraccion` del lado
async function componer({ tam, fraccion, fondo, redondeo = 0, borde = false, sinLogo = false }) {
  if (sinLogo) return sharp({ create: { width: tam, height: tam, channels: 4, background: fondo } }).png().toBuffer();
  const lado = Math.round(tam * fraccion);
  const logo = await sharp(await logoRecortado()).resize(lado, lado, { fit: 'inside' }).png().toBuffer();
  const capas = [{ input: logo, gravity: 'centre' }];
  let base = sharp({ create: { width: tam, height: tam, channels: 4, background: fondo || { r: 0, g: 0, b: 0, alpha: 0 } } });
  if (redondeo > 0) {
    const r = Math.round(tam * redondeo);
    const trazo = borde ? `<rect x="1" y="1" width="${tam - 2}" height="${tam - 2}" rx="${r}" fill="none" stroke="#C9C9D6" stroke-width="${Math.max(2, Math.round(tam * 0.006))}"/>` : '';
    const mascara = Buffer.from(`<svg width="${tam}" height="${tam}"><rect width="${tam}" height="${tam}" rx="${r}" fill="#fff"/></svg>`);
    base = base.composite([{ input: mascara, blend: 'dest-in' }]);
    const lienzo = await base.png().toBuffer();
    return sharp(lienzo).composite([...capas, ...(trazo ? [{ input: Buffer.from(`<svg width="${tam}" height="${tam}">${trazo}</svg>`) }] : [])]).png().toBuffer();
  }
  return base.composite(capas).png().toBuffer();
}

(async () => {
  const salidas = {
    // PWA "any": ficha blanca de esquinas redondeadas
    'public/pwa-192x192.png': { tam: 192, fraccion: 0.74, fondo: BLANCO, redondeo: 0.22, borde: true },
    'public/pwa-512x512.png': { tam: 512, fraccion: 0.74, fondo: BLANCO, redondeo: 0.22, borde: true },
    // PWA maskable: a sangre, el logo dentro del 80 % central seguro
    'public/pwa-maskable-512x512.png': { tam: 512, fraccion: 0.6, fondo: BLANCO },
    'public/favicon-48x48.png': { tam: 48, fraccion: 0.86, fondo: BLANCO, redondeo: 0.2 },
    // iOS exige un cuadrado opaco (él le pone las esquinas)
    'public/apple-touch-icon.png': { tam: 180, fraccion: 0.76, fondo: BLANCO },
    // Android (@capacitor/assets): ícono legacy, capa adaptativa de primer plano (transparente) y de fondo (blanca).
    // El primer plano lleva el logo al 84 %: el inset del 16.7 % del XML lo deja dentro de la zona segura.
    'assets/icon-only.png': { tam: 1024, fraccion: 0.74, fondo: BLANCO, redondeo: 0.22, borde: true },
    'assets/icon-foreground.png': { tam: 1024, fraccion: 0.84 },
    'assets/icon-background.png': { tam: 1024, fondo: BLANCO, sinLogo: true },
  };
  for (const [ruta, opc] of Object.entries(salidas)) {
    const buf = await componer(opc);
    await sharp(buf).toFile(path.join(raiz, ruta));
    console.log('OK', ruta, `${opc.tam}x${opc.tam}`);
  }
})();
