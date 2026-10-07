import { rangoDeSello } from '../utils/rangosSello';
import './RangoSello.css';

// Punto de color del rango de un sello (cobre, plata u oro). Con `conNombre` agrega la palabra ("Oro").
function RangoSello({ rango, conNombre = false, className = '' }) {
  const r = rangoDeSello(rango);
  return (
    <span
      className={`rango-sello rango-sello--${r.clave} ${className}`}
      title={`Sello de ${r.nombre.toLowerCase()}`}
      role="img"
      aria-label={`Sello de ${r.nombre.toLowerCase()}`}
    >
      <span className="rango-sello-punto" style={{ background: r.color }} aria-hidden="true" />
      {conNombre && <span className="rango-sello-nombre">{r.nombre}</span>}
    </span>
  );
}

export default RangoSello;
