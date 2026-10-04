import { ChevronDown } from 'lucide-react';
import './FilaCompacta.css';

// Fila de una lista compacta (actividades, cupones): miniatura, nombre, fechas y etiqueta de estado.
// Al tocarla se abre el detalle (children) debajo, sin salir de la lista.
//   estado: { texto, tono } con tono 'revision' | 'publicada' | 'rechazada' | 'inactiva'.
function FilaCompacta({ id, miniatura, titulo, subtitulo, estado, abierta, onAlternar, children }) {
  return (
    <li className={`fila-compacta ${abierta ? 'fila-compacta--abierta' : ''}`}>
      <button
        type="button"
        className="fila-compacta-cabecera"
        onClick={onAlternar}
        aria-expanded={abierta}
        aria-controls={abierta ? `${id}-detalle` : undefined}
      >
        <span className="fila-compacta-miniatura">{miniatura}</span>
        <span className="fila-compacta-texto">
          <strong>{titulo}</strong>
          {subtitulo && <span>{subtitulo}</span>}
        </span>
        {estado && <span className={`fila-compacta-estado fila-compacta-estado--${estado.tono}`}>{estado.texto}</span>}
        <ChevronDown size={16} strokeWidth={2.2} aria-hidden="true" className="fila-compacta-flecha" />
      </button>
      {abierta && <div className="fila-compacta-detalle" id={`${id}-detalle`}>{children}</div>}
    </li>
  );
}

export default FilaCompacta;
