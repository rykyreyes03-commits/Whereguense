import { useState } from 'react';
import './Onboarding.css';

const PASOS = [
  {
    fondo: 'verde',
    titulo: 'Genera sellos para tu negocio',
    texto: 'Crea actividades con código QR para que los turistas visiten tu local y se lleven un sello.',
    tipo: 'icono',
  },
  {
    fondo: 'coral',
    titulo: 'Muestra tu marca',
    texto: 'Personaliza tu perfil con fotos, horarios y productos para que los turistas te conozcan.',
    tipo: 'icono',
  },
  {
    fondo: 'azul',
    titulo: 'Intégrate en las rutas',
    texto: 'Aparece en el mapa cultural que exploran los visitantes de León.',
    tipo: 'ruta',
  },
];

function IconoSello() {
  return (
    <svg className="onboarding-icono" viewBox="0 0 64 64" width="120" height="120" fill="none" aria-hidden="true">
      <circle cx="32" cy="32" r="26" stroke="#fff" strokeWidth="3" strokeDasharray="4 6" />
      <path d="M20 8V5a1 1 0 0 1 1-1h3M44 4h3a1 1 0 0 1 1 1v3M60 44v3a1 1 0 0 1-1 1h-3M8 60H5a1 1 0 0 1-1-1v-3" stroke="#fff" strokeWidth="0" />
      <path d="M23 33l6 6 12-14" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconoNegocio() {
  return (
    <svg className="onboarding-icono" viewBox="0 0 64 64" width="120" height="120" fill="none" aria-hidden="true">
      <path d="M10 26l2.5-13h39L54 26M10 26v26a2.5 2.5 0 0 0 2.5 2.5h11v-15h17v15h11A2.5 2.5 0 0 0 54 52V26M10 26h44" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function OnboardingEmprendedor({ onTerminar }) {
  const [paso, setPaso] = useState(0);
  const actual = PASOS[paso];
  const esUltimo = paso === PASOS.length - 1;

  const avanzar = () => {
    if (esUltimo) {
      onTerminar?.();
    } else {
      setPaso(paso + 1);
    }
  };

  return (
    <div
      className={`onboarding-wrapper fondo-${actual.fondo}`}
      onClick={!esUltimo ? avanzar : undefined}
    >
      <div className="onboarding-adorno onboarding-adorno-superior" aria-hidden="true" />
      <div className="onboarding-adorno onboarding-adorno-inferior" aria-hidden="true" />

      {!esUltimo && (
        <button
          className="onboarding-omitir"
          onClick={(e) => { e.stopPropagation(); onTerminar?.(); }}
        >
          Omitir
        </button>
      )}

      <div className="onboarding-contenido" key={paso}>
        <h1 className="onboarding-titulo">{actual.titulo}</h1>

        {actual.tipo === 'icono' && paso === 0 && <IconoSello />}
        {actual.tipo === 'icono' && paso === 1 && <IconoNegocio />}

        {actual.tipo === 'ruta' && (
          <svg className="onboarding-ruta" viewBox="0 0 300 220" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M40 180 C 90 140, 110 100, 160 90 S 230 60, 260 40"
              fill="none"
              stroke="#ffffff"
              strokeWidth="4"
              strokeDasharray="2 10"
              strokeLinecap="round"
            />
            <circle cx="40" cy="180" r="9" fill="#ffffff" />
            <circle cx="160" cy="90" r="9" fill="#ffffff" />
            <circle cx="260" cy="40" r="9" style={{ fill: 'var(--color-turquoise)' }} />
          </svg>
        )}

        <p className="onboarding-texto">{actual.texto}</p>
      </div>

      {!esUltimo && (
        <button
          className="onboarding-siguiente"
          onClick={(e) => { e.stopPropagation(); avanzar(); }}
          aria-label="Siguiente"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden="true">
            <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      )}

      {!esUltimo && (
        <div className="onboarding-paginacion">
          {PASOS.map((_, i) => (
            <span key={i} className={`onboarding-punto ${i === paso ? 'activo' : ''}`}></span>
          ))}
        </div>
      )}

      {esUltimo && (
        <button className="onboarding-comenzar" onClick={avanzar}>
          Entendido
        </button>
      )}
    </div>
  );
}

export default OnboardingEmprendedor;
