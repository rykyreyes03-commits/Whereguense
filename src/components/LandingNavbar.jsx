import { useState } from 'react';
import './LandingNavbar.css';
import logoWheregueense from '../assets/logo_wheregueense.png';

const svgBase = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};
const IconMenu = (p) => (
  <svg {...svgBase} width={p.size || 24} height={p.size || 24} aria-hidden="true">
    <path d="M4 6h16M4 12h16M4 18h16" />
  </svg>
);
const IconClose = (p) => (
  <svg {...svgBase} width={p.size || 24} height={p.size || 24} aria-hidden="true">
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
);

const NAV_LINKS = [
  { pantalla: 'landing', texto: 'Inicio' },
  { pantalla: 'landingEventos', texto: 'Eventos' },
  { pantalla: 'landingMapas', texto: 'Mapas' },
];

function LandingNavbar({ activo, onNavigate, onComenzar }) {
  const [menuAbierto, setMenuAbierto] = useState(false);

  const irA = (pantalla) => {
    setMenuAbierto(false);
    onNavigate(pantalla);
  };

  return (
    <header className="landing-navbar">
      <div className="landing-navbar-inner">
        <button className="landing-logo" onClick={() => irA('landing')} type="button">
          <img src={logoWheregueense} alt="WhereGüense" className="landing-logo-img" />
        </button>

        <nav className={`landing-nav ${menuAbierto ? 'abierto' : ''}`}>
          {NAV_LINKS.map((l) => (
            <button
              key={l.pantalla}
              className={`landing-nav-link ${activo === l.pantalla ? 'landing-nav-link--activo' : ''}`}
              onClick={() => irA(l.pantalla)}
              type="button"
            >
              {l.texto}
            </button>
          ))}
          <button className="landing-btn-registro landing-btn-registro--movil" onClick={onComenzar} type="button">
            Registrarse
          </button>
        </nav>

        <button className="landing-btn-registro landing-btn-registro--desktop" onClick={onComenzar} type="button">
          Registrarse
        </button>

        <button
          className="landing-hamburguesa"
          onClick={() => setMenuAbierto((v) => !v)}
          aria-label={menuAbierto ? 'Cerrar menú' : 'Abrir menú'}
          aria-expanded={menuAbierto}
          type="button"
        >
          {menuAbierto ? <IconClose size={22} /> : <IconMenu size={22} />}
        </button>
      </div>
    </header>
  );
}

export default LandingNavbar;
