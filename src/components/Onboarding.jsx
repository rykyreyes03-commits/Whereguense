import { useState } from 'react';
import './Onboarding.css';
import explorador from '../assets/flujo-inicial/explorer_transparente_final.png';

const PASOS = [
  {
    fondo: 'verde',
    titulo: 'Compite, obtén sellos y trajes',
    tipo: 'personaje',
  },
  {
    fondo: 'coral',
    titulo: 'Personaliza tu avatar virtual',
    tipo: 'personaje',
  },
  {
    fondo: 'azul',
    titulo: 'Descubre la ruta Dariana de León',
    tipo: 'ruta',
  },
  {
    fondo: 'final',
    titulo: 'Wheregüense',
    subtitulo: 'RUTAS DARIANAS · CULTURA · TURISMO',
    tipo: 'final',
  },
];

function Onboarding({ onTerminar }) {
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
      <div className="onboarding-patron onboarding-patron-superior">
        {Array.from({ length: 6 }).map((_, i) => (
          <span key={i} className="onboarding-cuadro"></span>
        ))}
      </div>
      <div className="onboarding-patron onboarding-patron-inferior">
        {Array.from({ length: 6 }).map((_, i) => (
          <span key={i} className="onboarding-cuadro"></span>
        ))}
      </div>

      <div className="onboarding-contenido">
        {actual.tipo === 'final' ? (
          <>
            <h1 className="onboarding-logo">{actual.titulo}</h1>
            <p className="onboarding-subtitulo">{actual.subtitulo}</p>
          </>
        ) : (
          <h1 className="onboarding-titulo">{actual.titulo}</h1>
        )}

        {actual.tipo === 'personaje' && (
          <img className="onboarding-personaje" src={explorador} alt="" />
        )}

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
            <circle cx="260" cy="40" r="9" fill="#54C8C0" />
          </svg>
        )}
      </div>

      {!esUltimo && (
        <button
          className="onboarding-siguiente"
          onClick={(e) => { e.stopPropagation(); avanzar(); }}
          aria-label="Siguiente"
        >
          »
        </button>
      )}

      {!esUltimo && (
        <div className="onboarding-paginacion">
          {PASOS.slice(0, 3).map((_, i) => (
            <span key={i} className={`onboarding-punto ${i === paso ? 'activo' : ''}`}></span>
          ))}
        </div>
      )}

      {esUltimo && (
        <button className="onboarding-comenzar" onClick={avanzar}>
          Comenzar
        </button>
      )}
    </div>
  );
}

export default Onboarding;