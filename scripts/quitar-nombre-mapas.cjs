// Quita el nombre de la ciudad (caligrafía blanca) grabado al pie de las imágenes de src/assets/ciudades y deja solo el mapa.
// Cómo: se buscan los componentes conectados del dibujo (8 vecinos) y se borran los que caen COMPLETOS dentro de la zona del texto
// de cada ciudad; las calles, que se extienden fuera de esa zona, no se tocan aunque pasen por ella.
//
// Uso: node scripts/quitar-nombre-mapas.cjs <carpeta con los <ciudad>_final.png originales> [carpeta de salida]
// Escribe <ciudad>.webp (ya recortado y a 640 px de lado mayor) en la carpeta de salida (por defecto src/assets/ciudades).
const path = require('path');
const sharp = require('sharp');

const origen = process.argv[2];
const salida = process.argv[3] || path.join(__dirname, '..', 'src', 'assets', 'ciudades');
if (!origen) { console.error('Falta la carpeta de origen.'); process.exit(1); }

// Zona del texto como fracciones del ancho y el alto: [x0, x1, y0, y1]
const ZONAS = {
  leon: [0.34, 0.64, 0.82, 1.0],
  managua: [0.2, 0.76, 0.78, 0.95],
  granada: [0.27, 0.75, 0.84, 1.0],
  masaya: [0.3, 0.7, 0.84, 1.0],
  matagalpa: [0.32, 0.72, 0.84, 1.0],
  esteli: [0.34, 0.66, 0.8, 1.0],
  chinandega: [0.33, 0.67, 0.85, 1.0],
};
// Letras que quedan pegadas a una calle (no forman un componente propio): rectángulos [x0, y0, x1, y1] en píxeles de la imagen original.
// Matagalpa: la "M" toca el final de una calle justo encima; el rectángulo empieza debajo de esa calle.
const RECTANGULOS = {
  matagalpa: [[686, 1118, 866, 1236]],
};
const UMBRAL = 40; // alfa a partir del cual un píxel cuenta como dibujo
const ESCALA = 2; // la detección se hace a la mitad de resolución (más rápido); el borrado se aplica a resolución completa

async function procesar(ciudad) {
  const { data, info } = await sharp(path.join(origen, `${ciudad}_final.png`)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  const pw = Math.ceil(w / ESCALA);
  const ph = Math.ceil(h / ESCALA);
  // máscara reducida: un píxel es dibujo si alguno de su bloque lo es
  const mascara = new Uint8Array(pw * ph);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * 4 + 3] > UMBRAL) mascara[Math.floor(y / ESCALA) * pw + Math.floor(x / ESCALA)] = 1;
    }
  }
  // componentes conectados (relleno por pila)
  const etiqueta = new Int32Array(pw * ph);
  const comps = [];
  for (let i = 0; i < mascara.length; i++) {
    if (!mascara[i] || etiqueta[i]) continue;
    const id = comps.length + 1;
    const pila = [i];
    etiqueta[i] = id;
    let x0 = pw; let x1 = 0; let y0 = ph; let y1 = 0; let area = 0;
    while (pila.length) {
      const p = pila.pop();
      const x = p % pw; const y = (p - x) / pw;
      area += 1;
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx; const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= pw || ny >= ph) continue;
          const q = ny * pw + nx;
          if (mascara[q] && !etiqueta[q]) { etiqueta[q] = id; pila.push(q); }
        }
      }
    }
    comps.push({ id, x0, x1, y0, y1, area });
  }
  // los que caen completos dentro de la zona del texto se borran
  const [zx0, zx1, zy0, zy1] = ZONAS[ciudad].map((f, i) => f * (i < 2 ? pw : ph));
  const borrar = new Set(comps.filter((c) => c.x0 >= zx0 && c.x1 <= zx1 && c.y0 >= zy0 && c.y1 <= zy1).map((c) => c.id));
  // borrado a resolución completa: cada píxel dentro de un componente borrado (con 2 px de margen para el borde suavizado)
  const MARGEN = 2;
  let borrados = 0;
  const copia = Buffer.from(data);
  for (const c of comps) {
    if (!borrar.has(c.id)) continue;
    for (let y = Math.max(0, c.y0 * ESCALA - MARGEN); y < Math.min(h, (c.y1 + 1) * ESCALA + MARGEN); y++) {
      for (let x = Math.max(0, c.x0 * ESCALA - MARGEN); x < Math.min(w, (c.x1 + 1) * ESCALA + MARGEN); x++) {
        const px = Math.min(pw - 1, Math.floor(x / ESCALA)); const py = Math.min(ph - 1, Math.floor(y / ESCALA));
        // solo los píxeles de ese componente (o pegados a él): las calles que pasan por su caja no se tocan
        let toca = false;
        for (let dy = -1; dy <= 1 && !toca; dy++) {
          for (let dx = -1; dx <= 1 && !toca; dx++) {
            const nx = px + dx; const ny = py + dy;
            if (nx >= 0 && ny >= 0 && nx < pw && ny < ph && etiqueta[ny * pw + nx] === c.id) toca = true;
          }
        }
        if (toca) { copia[(y * w + x) * 4 + 3] = 0; borrados += 1; }
      }
    }
  }
  for (const [rx0, ry0, rx1, ry1] of RECTANGULOS[ciudad] || []) {
    for (let y = ry0; y < Math.min(h, ry1); y++) {
      for (let x = rx0; x < Math.min(w, rx1); x++) copia[(y * w + x) * 4 + 3] = 0;
    }
  }
  const img = sharp(copia, { raw: { width: w, height: h, channels: 4 } });
  const buf = await img.trim({ threshold: 8 }).resize(640, 640, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 86, alphaQuality: 95 }).toBuffer({ resolveWithObject: true });
  await sharp(buf.data).toFile(path.join(salida, `${ciudad}.webp`));
  console.log(`${ciudad}: ${comps.length} componentes, ${borrar.size} borrados (zona del texto), ${buf.info.width}x${buf.info.height}, ${Math.round(buf.info.size / 1024)} KB`);
}

(async () => {
  for (const ciudad of Object.keys(ZONAS)) await procesar(ciudad);
})();
