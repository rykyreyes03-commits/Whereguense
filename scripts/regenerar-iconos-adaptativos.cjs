// Regenera las capas del ícono adaptativo de Android al tamaño correcto.
//
// Por qué existe: @capacitor/assets 3.0.5, en modo Custom (icon-foreground.png +
// icon-background.png por separado), filtra mal las plantillas y genera
// mipmap-*/ic_launcher_foreground.png y _background.png a tamaño legacy
// (48…192 px) en vez de adaptativo (108…432 px). En el launcher no se nota,
// pero el splash de Android 12+ dibuja ese mismo recurso a ~160dp y se ve borroso.
//
// Mismo proceso que la herramienta (resize del PNG de origen), solo con los
// tamaños adaptativos. No toca los íconos legacy.
//
// Además deja la capa de fondo de ic_launcher*.xml sin inset (0%): con el 16.7%
// que escribe la herramienta, el splash de Android 12+ (OriginOS) muestra dos
// líneas negras en el borde derecho e inferior del ícono. El foreground sigue en 16.7%.
//
// Uso (después de cualquier `capacitor-assets generate` para Android):
//   node scripts/regenerar-iconos-adaptativos.cjs
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const raiz = path.join(__dirname, '..');
const res = path.join(raiz, 'android', 'app', 'src', 'main', 'res');

// Capa de 108dp por densidad (plantillas ANDROID_*_ADAPTIVE_ICON de @capacitor/assets)
const tamanos = { ldpi: 81, mdpi: 108, hdpi: 162, xhdpi: 216, xxhdpi: 324, xxxhdpi: 432 };
const capas = {
  ic_launcher_foreground: path.join(raiz, 'assets', 'icon-foreground.png'),
  ic_launcher_background: path.join(raiz, 'assets', 'icon-background.png'),
};

(async () => {
  for (const [densidad, lado] of Object.entries(tamanos)) {
    for (const [nombre, origen] of Object.entries(capas)) {
      const destino = path.join(res, `mipmap-${densidad}`, `${nombre}.png`);
      await sharp(origen).resize(lado, lado).png().toFile(destino);
      console.log(`mipmap-${densidad}/${nombre}.png  ${lado}x${lado}`);
    }
  }

  const fondoConInset = '<inset android:drawable="@mipmap/ic_launcher_background" android:inset="16.7%" />';
  const fondoSinInset = '<inset android:drawable="@mipmap/ic_launcher_background" android:inset="0%" />';
  for (const xml of ['ic_launcher.xml', 'ic_launcher_round.xml']) {
    const archivo = path.join(res, 'mipmap-anydpi-v26', xml);
    const contenido = fs.readFileSync(archivo, 'utf8');
    if (contenido.includes(fondoConInset)) {
      fs.writeFileSync(archivo, contenido.replace(fondoConInset, fondoSinInset));
      console.log(`mipmap-anydpi-v26/${xml}  fondo sin inset`);
    }
  }
})();
