// Prueba de getCategoriaIcono (marcadores del mapa). Uso: node docs/tests/sitio_front/categorias.test.mjs
import { sitios } from '../../../src/data/sitios.js';
import { getCategoriaIcono, CATEGORIAS_SITIO, svgPinSitio, COLOR_PIN_SITIO_ACTIVO } from '../../../src/utils/categoriaSitio.js';

let total = 0;
const fallas = [];
const ok = (cond, texto) => { total += 1; if (!cond) fallas.push(texto); console.log(`${cond ? 'OK   ' : 'FALLA'} ${texto}`); };
const clave = (name) => getCategoriaIcono({ name }).clave;

// Casos acordados en el encargo y los límites entre reglas
const casos = {
  'Catedral de León': 'iglesia',
  'Iglesia San Francisco de Asís': 'iglesia',
  'Iglesia Nuestra Señora del Pilar de Zaragoza': 'iglesia',
  'Museo de la Revolución': 'museo',
  'Centro Cultural y Museo Rigoberto López Pérez': 'museo',
  'Casa Museo y Archivo Rubén Darío': 'museo',
  'Palacio Municipal, hoy Museo de la Insurrección': 'museo',
  'Parque Central de León': 'parque',
  'Plazoleta Rubén Darío': 'parque',
  'Parque y Monumento a los Héroes y Mártires': 'parque',
  'Alcaldía Municipal de León / Edificio Central Marcos Somarriba': 'edificio',
  'Universidad Nacional de Nicaragua León': 'edificio',
  'Hotel El Convento / antiguo lugar vinculado a su infancia': 'edificio',
  'Hospital Escuela Oscar Danilo Rosales (HEODRA)': 'edificio',
  'Estatua de Rubén Darío - Colegio La Salle': 'monumento',
  'Escultura "Paz, hermano lobo"': 'monumento',
  'Placa de la Iglesia El Calvario vinculada a los hechos de la insurrección': 'monumento',
  'Ruinas de León Viejo': 'ruinas',
  'Ruinas de la Iglesia de Veracruz, Sutiaba': 'ruinas',
  'Fortaleza de la Inmaculada Concepción': 'ruinas',
  'Cancha / espacio histórico 23 de Julio': 'deporte',
  'Mercadito de Sutiaba como espacio cultural y tradicional': 'deporte',
  'Cementerio de Guadalupe': 'otro',
  'Sitio inventado sin categoría': 'otro',
};
for (const [nombre, esperada] of Object.entries(casos)) ok(clave(nombre) === esperada, `${nombre} -> ${esperada} (salió ${clave(nombre)})`);

ok(getCategoriaIcono({ name: 'Cualquier cosa', categoria: 'parque' }).clave === 'parque', 'un campo categoria válido manda sobre el nombre');
ok(getCategoriaIcono({ name: 'Iglesia X', categoria: 'inventada' }).clave === 'iglesia', 'un campo categoria desconocido se ignora');
ok(getCategoriaIcono(undefined).clave === 'otro' && getCategoriaIcono({}).clave === 'otro', 'sin datos -> otro');

const colores = { iglesia: '#1565C0', museo: '#6A1B9A', parque: '#2E7D32', edificio: '#1B2A6B', monumento: '#E65100', ruinas: '#BF360C', deporte: '#00695C', otro: '#546E7A' };
for (const [k, c] of Object.entries(colores)) ok(CATEGORIAS_SITIO[k].color === c, `${k}: color del pin ${c}`);
ok(Object.values(CATEGORIAS_SITIO).every((c) => !('emoji' in c) && !('icono' in c)), 'ninguna categoría trae emoji ni ícono: solo color');

// SVG del pin: el clásico de Leaflet (25x41) con el color de la categoría y el círculo blanco; rojo al seleccionar
for (const [k, cat] of Object.entries(CATEGORIAS_SITIO)) {
  const normal = svgPinSitio(cat);
  const activo = svgPinSitio(cat, true);
  ok(normal.includes('viewBox="0 0 25 41"') && normal.includes(`fill="${cat.color}"`), `${k}: pin con su color`);
  ok(normal.includes('<circle cx="12.5" cy="12.5" r="4.5" fill="white" opacity="0.95"/>') && (normal.match(/<path/g) || []).length === 1, `${k}: solo el círculo blanco adentro (sin ícono)`);
  ok(activo.includes(`fill="${COLOR_PIN_SITIO_ACTIVO}"`) && !activo.includes(`fill="${cat.color}"`), `${k}: seleccionado en ${COLOR_PIN_SITIO_ACTIVO}`);
  ok(!/[\u{1F300}-\u{1FAFF}☀-➿]/u.test(normal), `${k}: el SVG no lleva emojis`);
}
ok(COLOR_PIN_SITIO_ACTIVO === '#C62828', 'seleccionado: #C62828');

const usadas = new Set(sitios.map((s) => getCategoriaIcono(s).clave));
ok(usadas.size === 8, `los ${sitios.length} sitios usan las 8 categorías (${[...usadas].join(', ')})`);

console.log(`\n${total - fallas.length}/${total} comprobaciones`);
if (fallas.length) { console.log('FALLAS:\n' + fallas.join('\n')); process.exit(1); }
