// Categoría de un sitio turístico para su marcador del mapa: emoji y color de borde.
// Se decide por el nombre del sitio (no hay columna de categoría en la base); si algún día el sitio trae `categoria`
// con una de las claves de abajo, esa manda.

export const CATEGORIAS_SITIO = {
  iglesia: { clave: 'iglesia', emoji: '⛪', color: '#B8860B', nombre: 'Iglesias y catedrales' },
  museo: { clave: 'museo', emoji: '🏛️', color: '#1B2A6B', nombre: 'Museos y centros culturales' },
  parque: { clave: 'parque', emoji: '🌳', color: '#0D7D5E', nombre: 'Parques y plazas' },
  edificio: { clave: 'edificio', emoji: '🏫', color: '#2563EB', nombre: 'Edificios históricos e instituciones' },
  monumento: { clave: 'monumento', emoji: '🗿', color: '#C0622A', nombre: 'Monumentos y estatuas' },
  ruinas: { clave: 'ruinas', emoji: '🏚️', color: '#C0392B', nombre: 'Ruinas y fortificaciones' },
  deporte: { clave: 'deporte', emoji: '⚽', color: '#0E7490', nombre: 'Espacios deportivos y recreativos' },
  otro: { clave: 'otro', emoji: '🏢', color: '#6B7280', nombre: 'Otros' },
};

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
