// Textos de reseñas, una sola forma en toda la app.
import { localeFechas } from './idioma.js';

// "4.6", "5"; vacío si no hay promedio.
export function textoPromedio(valor) {
  if (valor == null) return '';
  const n = Number(valor);
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

export function textoCantidad(total) {
  return total === 1 ? '1 reseña' : `${total} reseñas`;
}

export function fechaCorta(iso) {
  return new Date(iso).toLocaleDateString(localeFechas(), { day: 'numeric', month: 'short', year: 'numeric' });
}
