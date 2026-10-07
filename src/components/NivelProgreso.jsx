import { useTranslation } from 'react-i18next';
import { textoPuntos } from '../utils/rangosSello';
import './NivelProgreso.css';

// Nivel actual, barra de avance hacia el siguiente y puntos "3 / 6" (038). `info` viene de useNivel.
function NivelProgreso({ info }) {
  const { t } = useTranslation();
  const { nivel, puntosActuales, puntosParaSiguiente, porcentaje } = info;
  return (
    <section className="nivel-progreso" aria-label={t('nivel.nivel', { n: nivel })}>
      <div className="nivel-progreso-cabecera">
        <strong className="nivel-progreso-nivel">{t('nivel.nivel', { n: nivel })}</strong>
        <span className="nivel-progreso-puntos">
          {t('nivel.puntos', { a: textoPuntos(puntosActuales), b: puntosParaSiguiente })}
        </span>
      </div>
      <div
        className="nivel-progreso-barra"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={puntosParaSiguiente}
        aria-valuenow={puntosActuales}
        aria-valuetext={t('nivel.valorTexto', { a: textoPuntos(puntosActuales), b: puntosParaSiguiente, siguiente: nivel + 1 })}
      >
        <div className="nivel-progreso-relleno" style={{ width: `${porcentaje}%` }} />
      </div>
      <p className="nivel-progreso-pie">{t('nivel.pie', { n: nivel + 1, p: textoPuntos(puntosParaSiguiente - puntosActuales) })}</p>
    </section>
  );
}

export default NivelProgreso;
