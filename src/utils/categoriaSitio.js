// Categoría de un sitio turístico para su marcador del mapa: el color del pin (sin ícono ni emoji adentro).
// Se decide por el nombre del sitio (no hay columna de categoría en la base); si algún día el sitio trae `categoria`
// con una de las claves de abajo, esa manda.

export const COLOR_PIN_SITIO_ACTIVO = '#C62828';

export const CATEGORIAS_SITIO = {
  iglesia: { clave: 'iglesia', color: '#1565C0', nombre: 'Iglesias y catedrales' },
  museo: { clave: 'museo', color: '#6A1B9A', nombre: 'Museos y centros culturales' },
  parque: { clave: 'parque', color: '#2E7D32', nombre: 'Parques y plazas' },
  edificio: { clave: 'edificio', color: '#1B2A6B', nombre: 'Edificios históricos e instituciones' },
  monumento: { clave: 'monumento', color: '#E65100', nombre: 'Monumentos y estatuas' },
  ruinas: { clave: 'ruinas', color: '#BF360C', nombre: 'Ruinas y fortificaciones' },
  deporte: { clave: 'deporte', color: '#00695C', nombre: 'Espacios deportivos y recreativos' },
  otro: { clave: 'otro', color: '#546E7A', nombre: 'Otros' },
};

// SVG del pin clásico de Leaflet (25x41) del color de la categoría, con el círculo blanco de siempre.
export function svgPinSitio(categoria, seleccionado = false) {
  const color = seleccionado ? COLOR_PIN_SITIO_ACTIVO : categoria.color;
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 25 41">'
    + `<path fill="${color}" stroke="rgba(0,0,0,0.3)" stroke-width="0.8" d="M12.5 0C5.6 0 0 5.6 0 12.5c0 6.3 12.5 28.5 12.5 28.5S25 18.8 25 12.5C25 5.6 19.4 0 12.5 0z"/>`
    + '<circle cx="12.5" cy="12.5" r="4.5" fill="white" opacity="0.95"/>'
    + '</svg>';
}

const sinTildes = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// El orden importa: la primera regla que coincide gana ("Ruinas de la Iglesia…" es ruinas, no iglesia;
// "Palacio Municipal, hoy Museo…" es museo, no edificio; "Placa de la Iglesia El Calvario…" es monumento).
const REGLAS = [
  ['ruinas', /ruinas|restos de la muralla|fortaleza|fortin|arco barroco/],
  ['monumento', /^placa|estatua|escultura|monumento donde|mausoleo|muralismo/],
  ['parque', /parque|plazoleta|plaza/],
  ['museo', /museo|centro cultural|centro de arte|centro sociocultural|casa de la cultura|biblioteca|galeria|exposicion|teatro|archivo|escuela de musica/],
  ['iglesia', /iglesia|catedral|santuario|ermita|capilla|basilica/],
  ['deporte', /cancha|mercadito|mercado|puerto/],
  ['edificio', /alcaldia|universidad|colegio|hotel|hospital|palacio|facultad|estacion|escuela|casa|casas|comando|reformatorio|conjunto|inmueble/],
];

export function getCategoriaIcono(sitio) {
  if (sitio?.categoria && CATEGORIAS_SITIO[sitio.categoria]) return CATEGORIAS_SITIO[sitio.categoria];
  const nombre = sinTildes(sitio?.name || sitio?.nombre || '');
  for (const [clave, patron] of REGLAS) {
    if (patron.test(nombre)) return CATEGORIAS_SITIO[clave];
  }
  return CATEGORIAS_SITIO.otro;
}
