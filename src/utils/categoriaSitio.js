// Categoría de un sitio turístico para su marcador del mapa: color del pin e ícono SVG (blanco, centrado en 12.5, 12.5
// del pin de 25x41; sin emojis, que se ven distinto en cada dispositivo).
// Se decide por el nombre del sitio (no hay columna de categoría en la base); si algún día el sitio trae `categoria`
// con una de las claves de abajo, esa manda.

export const COLOR_PIN_SITIO_ACTIVO = '#C62828';

export const CATEGORIAS_SITIO = {
  iglesia: {
    clave: 'iglesia', color: '#1565C0', nombre: 'Iglesias y catedrales',
    icono: '<path fill="white" d="M11.5 6h2v3.5H17v2h-3.5V17h-2v-5.5H8v-2h3.5z"/>',
  },
  museo: {
    clave: 'museo', color: '#1B2A6B', nombre: 'Museos y centros culturales',
    icono: '<path fill="white" d="M8 16h9v1H8zm0-7h1v6H8zm4-1h1v7h-1zm4 1h1v6h-1zM8 8h9l-4.5-2z"/>',
  },
  parque: {
    clave: 'parque', color: '#2E7D32', nombre: 'Parques y plazas',
    icono: '<path fill="white" d="M12.5 7l3 4h-2l2 3.5h-2.5V17h-1v-2.5H9.5l2-3.5h-2z"/>',
  },
  edificio: {
    clave: 'edificio', color: '#37474F', nombre: 'Edificios históricos e instituciones',
    icono: '<path fill="white" fill-rule="evenodd" d="M9 8h7v9h-2v-2h-3v2H9zm2 2h1v1h-1zm2 0h1v1h-1zm-2 2h1v1h-1zm2 0h1v1h-1z"/>',
  },
  monumento: {
    clave: 'monumento', color: '#4E342E', nombre: 'Monumentos y estatuas',
    icono: '<path fill="white" d="M11.5 7l1-1 1 1 1 9h-4zm-1 9h5v1h-5z"/>',
  },
  ruinas: {
    clave: 'ruinas', color: '#6A1515', nombre: 'Ruinas y fortificaciones',
    icono: '<path fill="white" d="M8 17h3v-4a2 2 0 014 0v4h3v-4a5 5 0 00-10 0z" opacity="0.6"/><path fill="white" d="M8 17h3v-5h-3zm7 0h3v-5h-3z"/>',
  },
  deporte: {
    clave: 'deporte', color: '#00695C', nombre: 'Espacios deportivos y recreativos',
    icono: '<circle cx="12.5" cy="12.5" r="4" fill="none" stroke="white" stroke-width="1.5"/><line x1="12.5" y1="8.5" x2="12.5" y2="16.5" stroke="white" stroke-width="1"/>',
  },
  // Sin categoría clara: solo el círculo blanco
  otro: {
    clave: 'otro', color: '#455A64', nombre: 'Otros',
    icono: '<circle cx="12.5" cy="12.5" r="5" fill="white" opacity="0.9"/>',
  },
};

// SVG del pin de gota estándar (25x41, como el de Leaflet) con el color y el ícono de la categoría.
export function svgPinSitio(categoria, seleccionado = false) {
  const color = seleccionado ? COLOR_PIN_SITIO_ACTIVO : categoria.color;
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 25 41">'
    + `<path fill="${color}" stroke="white" stroke-width="1" d="M12.5 0C5.6 0 0 5.6 0 12.5c0 6.3 12.5 28.5 12.5 28.5S25 18.8 25 12.5C25 5.6 19.4 0 12.5 0z"/>`
    + categoria.icono
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
