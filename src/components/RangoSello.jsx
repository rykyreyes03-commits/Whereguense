import { useTranslation } from 'react-i18next';
import { rangoDeSello } from '../utils/rangosSello';
import './RangoSello.css';

// Punto de color del rango de un sello (cobre, plata u oro). Con `conNombre` agrega la palabra ("Oro").
function RangoSello({ rango, conNombre = false, className = '' }) {
  const { t } = useTranslation();
  const r = rangoDeSello(rango);
  return (
    <span
      className={`rango-sello rango-sello--${r.clave} ${className}`}
      title={t(`rango.sello.${r.clave}`)}
      role="img"
      aria-label={t(`rango.sello.${r.clave}`)}
    >
      <span className="rango-sello-punto" style={{ background: r.color }} aria-hidden="true" />
      {conNombre && <span className="rango-sello-nombre">{t(`rango.${r.clave}`)}</span>}
    </span>
  );
}

export default RangoSello;
