import LandingNavbar from './LandingNavbar';
import './LandingMapas.css';

const RUTAS = [
  { tipo: 'dariana', titulo: 'Ruta Dariana', blurb: 'El legado histórico y literario de Rubén Darío, en el corazón de León.' },
  { tipo: 'culturales', titulo: 'Circuitos culturales', blurb: 'Luchas históricas, arte plástico, tradición religiosa y mitos urbanos.' },
  { tipo: 'creativos', titulo: 'Circuitos creativos', blurb: 'Diseño, artes visuales, gastronomía e industrias culturales independientes.' },
];

function LandingMapas({ onNavigate, onComenzar }) {
  return (
    <div className="landing">
      <LandingNavbar activo="landingMapas" onNavigate={onNavigate} onComenzar={onComenzar} />
      <section className="lm-hero">
        <div className="lm-hero-inner">
          <h1>Mapas</h1>
          <p>Explora las rutas y circuitos de León.</p>
        </div>
      </section>
      <section className="lm-lista">
        <div className="lm-lista-inner">
          {RUTAS.map((r) => (
            <button
              key={r.tipo}
              className="lm-card"
              onClick={() => onNavigate(`landingRuta_${r.tipo}`)}
              type="button"
            >
              <h2>{r.titulo}</h2>
              <p>{r.blurb}</p>
              <span className="lm-card-link">Ver ruta →</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

export default LandingMapas;
