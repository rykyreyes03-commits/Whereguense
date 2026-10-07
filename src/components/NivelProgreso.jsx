import { textoPuntos } from '../utils/rangosSello';
import './NivelProgreso.css';

// Nivel actual, barra de avance hacia el siguiente y puntos "3 / 6" (038). `info` viene de useNivel.
function NivelProgreso({ info }) {
  const { nivel, puntosActuales, puntosParaSiguiente, porcentaje } = info;
  return (
    <section className="nivel-progreso" aria-label={`Nivel ${nivel}`}>
      <div className="nivel-progreso-cabecera">
        <strong className="nivel-progreso-nivel">Nivel {nivel}</strong>
        <span className="nivel-progreso-puntos">
          {textoPuntos(puntosActuales)} / {puntosParaSiguiente} puntos
        </span>
      </div>
      <div
        className="nivel-progreso-barra"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={puntosParaSiguiente}
        aria-valuenow={puntosActuales}
        aria-valuetext={`${textoPuntos(puntosActuales)} de ${puntosParaSiguiente} puntos para el nivel ${nivel + 1}`}
      >
        <div className="nivel-progreso-relleno" style={{ width: `${porcentaje}%` }} />
      </div>
      <p className="nivel-progreso-pie">Para el nivel {nivel + 1}: {textoPuntos(puntosParaSiguiente - puntosActuales)} puntos más</p>
    </section>
  );
}

export default NivelProgreso;
