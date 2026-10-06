import { Star } from 'lucide-react';
import { textoCantidad, textoPromedio } from '../utils/resenas';
import { useResumenResenas } from '../hooks/useResenas';
import './ListaResenas.css';

// "★ 4.6 · 12 reseñas" o "Aún sin reseñas". Mientras carga (o si falla) no dibuja nada.
function LineaResenas({ negocioId }) {
  const resumen = useResumenResenas(negocioId);
  if (!resumen) return null;
  if (resumen.total === 0) return <span className="resenas-linea">Aún sin reseñas</span>;
  return (
    <span className="resenas-linea">
      <Star size={14} strokeWidth={2} aria-hidden="true" className="estrella estrella--llena" />
      <strong>{textoPromedio(resumen.promedio)}</strong>
      <span aria-hidden="true">·</span>
      <span>{textoCantidad(resumen.total)}</span>
    </span>
  );
}

export default LineaResenas;
