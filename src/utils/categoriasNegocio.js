// Categorías de un negocio. La categoría se guarda como texto libre en negocio.categoria:
// las de la lista tal cual y, con "Otro", el texto que escribió el dueño en "¿Cuál?" (máximo 40).
export const CATEGORIAS_NEGOCIO = ['Cafetería', 'Restaurante', 'Arte', 'Artesanía', 'Hospedaje'];
export const OTRO_NEGOCIO = 'Otro';
export const OPCIONES_CATEGORIA_NEGOCIO = [...CATEGORIAS_NEGOCIO, OTRO_NEGOCIO];

// Valor guardado -> estado del formulario. Lo que no está en la lista (o el "Otro" de antes) se muestra
// como "Otro" con ese texto en "¿Cuál?".
export function separarCategoriaNegocio(valor) {
  const texto = String(valor || '').trim();
  if (!texto) return { opcion: '', otro: '' };
  if (CATEGORIAS_NEGOCIO.includes(texto)) return { opcion: texto, otro: '' };
  return { opcion: OTRO_NEGOCIO, otro: texto };
}

// Estado del formulario -> valor que se guarda ('' si falta algo).
export function unirCategoriaNegocio(opcion, otro) {
  if (opcion === OTRO_NEGOCIO) return String(otro || '').trim();
  return opcion || '';
}
