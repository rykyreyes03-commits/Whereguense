import { ChevronDown, ChevronRight } from 'lucide-react';
import './FilaCompacta.css';

// Fila de una lista compacta (actividades, cupones): miniatura, nombre, fechas y etiqueta de estado.
// Al tocarla se abre el detalle (children) debajo, sin salir de la lista; o, con onAbrir, abre su propia pantalla.
//   estado: { texto, tono } con tono 'revision' | 'publicada' | 'rechazada' | 'inactiva'.
function FilaCompacta({ id, miniatura, titulo, subtitulo, estado, abierta = false, onAlternar, onAbrir, children }) {
  const abreOtraPantalla = Boolean(onAbrir);
  return (
    <li className={`fila-compacta ${abierta ? 'fila-compacta--abierta' : ''}`}>
      <button
        type="button"
        className="fila-compacta-cabecera"
        onClick={abreOtraPantalla ? onAbrir : onAlternar}
        aria-expanded={abreOtraPantalla ? undefined : abierta}
        aria-haspopup={abreOtraPantalla ? 'dialog' : undefined}
        aria-controls={!abreOtraPantalla && abierta ? `${id}-detalle` : undefined}
      >
        <span className="fila-compacta-miniatura">{miniatura}</span>
        <span className="fila-compacta-texto">
          <strong>{titulo}</strong>
          {subtitulo && <span>{subtitulo}</span>}
        </span>
        {estado && <span className={`fila-compacta-estado fila-compacta-estado--${estado.tono}`}>{estado.texto}</span>}
        {abreOtraPantalla
          ? <ChevronRight size={18} strokeWidth={2.2} aria-hidden="true" className="fila-compacta-flecha fila-compacta-flecha--fija" />
          : <ChevronDown size={16} strokeWidth={2.2} aria-hidden="true" className="fila-compacta-flecha" />}
      </button>
      {!abreOtraPantalla && abierta && <div className="fila-compacta-detalle" id={`${id}-detalle`}>{children}</div>}
    </li>
  );
}

export default FilaCompacta;
