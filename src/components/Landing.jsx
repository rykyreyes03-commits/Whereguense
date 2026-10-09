import { useEffect } from 'react';
import './Landing.css';
import LandingNavbar from './LandingNavbar';
import SolicitudDemo from './SolicitudDemo';
import touristPresenting from '../assets/landing/tourist-presenting.png';
import parejaTuristas from '../assets/landing/pareja-turistas.png';
import foto1 from '../assets/landing/foto-1.png';
import foto2 from '../assets/landing/foto-2.png';
import foto3 from '../assets/landing/foto-3.png';
import gigantona from '../assets/flujo-inicial/gigantona.png';
import cabezon from '../assets/flujo-inicial/explorer_transparente_final.png';
import trajeVestidoAzul from '../assets/avatar/gigantona_2.png';
import trajeVestidoCrema from '../assets/avatar/gigantona_3.png';
import trajeVestidoAmarillo from '../assets/avatar/gigantona_4.png';
import trajeVestidoVerde from '../assets/avatar/gigantona_5.png';
import trajeUniformeAzul from '../assets/avatar/ropa_2.png';
import trajeCeremonial from '../assets/avatar/ropa_3.png';
import trajeBanda from '../assets/avatar/ropa_6.png';
import trajeVerde from '../assets/avatar/ropa_4.png';

/* ===== Iconos (estilo Lucide, 24 viewBox, trazo 1.75) ===== */
const svgBase = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};
const IconNavigation = (p) => (
  <svg {...svgBase} width={p.size || 24} height={p.size || 24} aria-hidden="true">
    <polygon points="3 11 22 2 13 21 11 13 3 11" />
  </svg>
);
const IconCalendar = (p) => (
  <svg {...svgBase} width={p.size || 24} height={p.size || 24} aria-hidden="true">
    <path d="M8 2v4M16 2v4M3 10h18" />
    <rect width="18" height="18" x="3" y="4" rx="2" />
  </svg>
);
const IconPassport = (p) => (
  <svg {...svgBase} width={p.size || 24} height={p.size || 24} aria-hidden="true">
    <rect width="16" height="20" x="4" y="2" rx="2" />
    <circle cx="12" cy="10" r="3" />
    <path d="M9 17h6" />
  </svg>
);
const IconUser = (p) => (
  <svg {...svgBase} width={p.size || 24} height={p.size || 24} aria-hidden="true">
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21a8 8 0 0 1 16 0" />
  </svg>
);
const IconGear = (p) => (
  <svg {...svgBase} width={p.size || 24} height={p.size || 24} aria-hidden="true">
    <circle cx="12" cy="12" r="3" />
    <path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" />
  </svg>
);
const IconChevronsUp = (p) => (
  <svg {...svgBase} width={p.size || 24} height={p.size || 24} aria-hidden="true">
    <path d="m7 11 5-5 5 5M7 18l5-5 5 5" />
  </svg>
);
const IconShirt = (p) => (
  <svg {...svgBase} width={p.size || 24} height={p.size || 24} aria-hidden="true">
    <path d="M15 3l5 3-2.5 4L15 8.5V21H9V8.5L6.5 10 4 6l5-3a3 3 0 0 0 6 0Z" />
  </svg>
);
const IconArrowRight = (p) => (
  <svg {...svgBase} width={p.size || 24} height={p.size || 24} aria-hidden="true">
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);
const IconMapPin = (p) => (
  <svg {...svgBase} width={p.size || 24} height={p.size || 24} aria-hidden="true">
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

const TRAJES = [
  trajeVestidoAzul,
  trajeVestidoCrema,
  trajeVestidoAmarillo,
  trajeVestidoVerde,
  trajeUniformeAzul,
  trajeCeremonial,
  trajeBanda,
  trajeVerde,
];

const PASOS_PERSONALIZACION = [
  { Icono: IconUser, texto: 'Personaje base' },
  { Icono: IconGear, texto: 'Accesorios' },
  { Icono: IconChevronsUp, texto: 'Nuevos niveles' },
  { Icono: IconShirt, texto: 'Personalización' },
];

function Landing({ onComenzar, onNavigate }) {

  useEffect(() => {
    const els = document.querySelectorAll('[data-reveal]');
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!('IntersectionObserver' in window) || reduce) {
      els.forEach((el) => el.classList.add('reveal-visible'));
      return undefined;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('reveal-visible');
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <div className="landing">
      <LandingNavbar activo="landing" onNavigate={onNavigate} onComenzar={onComenzar} />

      {/* ===== Hero ===== */}
      <section className="landing-hero" id="landing-hero">
        <div className="landing-hero-inner">
          <div className="landing-hero-texto" data-reveal>
            <h1>Haz que el turismo<br />sea más divertido</h1>
            <p>Motiva tus viajes y exploraciones con un nuevo marco interactivo para tus recorridos.</p>
            <button className="landing-btn-comenzar" onClick={onComenzar} type="button">
              Comenzar
            </button>
          </div>

          <div className="landing-hero-collage" data-reveal aria-hidden="true">
            <span className="landing-hero-comillas">&rdquo;</span>
            <img className="landing-collage-foto landing-collage-foto--1" src={foto1} alt="" />
            <img className="landing-collage-foto landing-collage-foto--2" src={foto2} alt="" />
            <img className="landing-collage-foto landing-collage-foto--3" src={foto3} alt="" />
            <img className="landing-collage-turista" src={touristPresenting} alt="" />
          </div>
        </div>
      </section>

      {/* ===== ¿Qué es Wheregüense? ===== */}
      <section className="landing-que-es" id="landing-que-es">
        <div className="landing-que-es-inner">
          <h2 data-reveal>¿Qué es Wheregüense?</h2>
          <p className="landing-que-es-sub" data-reveal>
            Wheregüense es una plataforma que conecta a visitantes y locales con las experiencias
            culturales, históricas y turísticas de León.
          </p>

          <div className="landing-cols">
            <article className="landing-col" data-reveal>
              <span className="landing-col-icono"><IconNavigation size={22} /></span>
              <h3>Descubre</h3>
              <p>Encuentra lugares, eventos, emprendimientos y experiencias culturales únicas.</p>
            </article>
            <article className="landing-col" data-reveal>
              <span className="landing-col-icono"><IconCalendar size={22} /></span>
              <h3>Recorre</h3>
              <p>Explora rutas diseñadas para que conozcas la historia y el encanto de nuestra ciudad.</p>
            </article>
            <article className="landing-col" data-reveal>
              <span className="landing-col-icono"><IconPassport size={22} /></span>
              <h3>Colecciona</h3>
              <p>Obtén sellos digitales, sube de nivel y crea tu propio pasaporte cultural.</p>
            </article>
          </div>
        </div>
      </section>

      {/* ===== Ruta Dariana ===== */}
      <section className="landing-ruta" id="landing-ruta">
        <div className="landing-ruta-inner">
          <div className="landing-ruta-texto" data-reveal>
            <h2>Ruta Dariana</h2>
            <p className="landing-ruta-lead">Tu próxima aventura comienza en León.</p>
            <p>
              Un recorrido por 8 sitios llenos de historia, literatura y cultura que forman parte del
              legado dariano.
            </p>
            <button className="landing-btn-explorar" onClick={onComenzar} type="button">
              Explorar <IconArrowRight size={18} />
            </button>
            <div className="landing-stats">
              <div className="landing-stat">
                <strong>8</strong>
                <span>Sitios</span>
              </div>
              <div className="landing-stat-div" aria-hidden="true" />
              <div className="landing-stat">
                <strong>3-4</strong>
                <span>horas</span>
              </div>
            </div>
          </div>
          <div className="landing-ruta-media" data-reveal>
            <img src={parejaTuristas} alt="Pareja de turistas tomándose una foto" />
          </div>
        </div>
      </section>

      {/* ===== Personalización ===== */}
      <section className="landing-perso" id="landing-perso">
        <div className="landing-perso-inner">
          <div className="landing-perso-personajes" data-reveal>
            <img className="landing-perso-gigantona" src={gigantona} alt="La Gigantona" />
            <img className="landing-perso-cabezon" src={cabezon} alt="El Cabezón" />
          </div>

          <ol className="landing-perso-lista" data-reveal>
            {PASOS_PERSONALIZACION.map(({ Icono, texto }, i) => (
              <li key={i} className="landing-perso-paso">
                <span className="landing-perso-paso-icono"><Icono size={18} /></span>
                <span className="landing-perso-paso-guion" aria-hidden="true" />
                <span className="landing-perso-paso-texto">{texto}</span>
              </li>
            ))}
          </ol>

          <div className="landing-perso-derecha" data-reveal>
            <h2>Personalización</h2>
            <p>Elige un personaje y personalízalo mientras avanzas por Wheregüense.</p>
            <div className="landing-trajes">
              {TRAJES.map((src, i) => (
                <div key={i} className="landing-traje">
                  <img src={src} alt="" aria-hidden="true" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <SolicitudDemo />

      {/* ===== CTA final ===== */}
      <section className="landing-cta" id="landing-cta">
        <svg className="landing-cta-mapa" viewBox="0 0 400 300" aria-hidden="true" preserveAspectRatio="xMidYMid slice">
          <path
            d="M60 70 C 110 40, 150 60, 180 50 C 230 35, 280 70, 320 90 C 350 110, 340 160, 300 190 C 270 215, 220 210, 190 235 C 150 265, 110 250, 90 210 C 70 175, 40 150, 55 110 C 62 92, 55 82, 60 70 Z"
            fill="currentColor"
            opacity="0.12"
          />
          <path
            d="M70 250 C 140 210, 150 150, 220 120 S 320 80, 340 55"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeDasharray="2 10"
            strokeLinecap="round"
            opacity="0.5"
          />
        </svg>
        <div className="landing-cta-inner" data-reveal>
          <span className="landing-cta-pin"><IconMapPin size={26} /></span>
          <h2>Prepárate para descubrir León</h2>
          <p>Tu próxima experiencia está más cerca de lo que crees.</p>
          <button className="landing-btn-registro landing-btn-registro--cta" onClick={onComenzar} type="button">
            Registrarse
          </button>
        </div>
      </section>
    </div>
  );
}

export default Landing;
