// Prueba de getCategoriaIcono (marcadores del mapa). Uso: node docs/tests/sitio_front/categorias.test.mjs
import { sitios } from '../../../src/data/sitios.js';
import { getCategoriaIcono, CATEGORIAS_SITIO } from '../../../src/utils/categoriaSitio.js';

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

const colores = { iglesia: '#B8860B', museo: '#1B2A6B', parque: '#0D7D5E', edificio: '#2563EB', monumento: '#C0622A', ruinas: '#C0392B', deporte: '#0E7490', otro: '#6B7280' };
const emojis = { iglesia: '⛪', museo: '🏛️', parque: '🌳', edificio: '🏫', monumento: '🗿', ruinas: '🏚️', deporte: '⚽', otro: '🏢' };
for (const [k, c] of Object.entries(colores)) ok(CATEGORIAS_SITIO[k].color === c && CATEGORIAS_SITIO[k].emoji === emojis[k], `${k}: emoji y color ${c}`);

const usadas = new Set(sitios.map((s) => getCategoriaIcono(s).clave));
ok(usadas.size === 8, `los ${sitios.length} sitios usan las 8 categorías (${[...usadas].join(', ')})`);
ok(sitios.every((s) => getCategoriaIcono(s).emoji), 'todos los sitios tienen emoji');

console.log(`\n${total - fallas.length}/${total} comprobaciones`);
if (fallas.length) { console.log('FALLAS:\n' + fallas.join('\n')); process.exit(1); }
