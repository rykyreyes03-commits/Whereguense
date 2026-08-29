import { useState } from 'react';
import './Onboarding.css';
import avatarCirculo from '../assets/flujo-inicial/avatar_transparente.png';
import chibiFlanqueado from '../assets/flujo-inicial/chibi_transparente_final.png';

const PASOS = [
  {
    fondo: 'verde',
    titulo: 'Compite, gana sellos y trajes',
    texto: 'Cada sitio que visitas suma puntos, insignias y piezas nuevas para tu danzante.',
    tipo: 'personaje',
    imagen: avatarCirculo,
  },
  {
    fondo: 'coral',
    titulo: 'Personaliza tu avatar',
    texto: 'Arma tu propio Cabezón o Gigantona con rostros, sombreros y trajes folclóricos.',
    tipo: 'personaje',
    imagen: chibiFlanqueado,
  },
  {
    fondo: 'azul',
    titulo: 'Descubre la ruta Dariana',
    texto: 'Sigue los pasos de Rubén Darío por León y desbloquea su historia sitio a sitio.',
    tipo: 'ruta',
  },
  {
    fondo: 'final',
    titulo: 'Wheregüense',
    subtitulo: 'Tu pasaporte cultural de León',
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
        {actual.tipo === 'final' ? (
          <>
            <h1 className="onboarding-logo">{actual.titulo}</h1>
            <p className="onboarding-subtitulo">{actual.subtitulo}</p>
          </>
        ) : (
          <>
            <h1 className="onboarding-titulo">{actual.titulo}</h1>

            {actual.tipo === 'personaje' && (
              <img className="onboarding-personaje" src={actual.imagen} alt="" />
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
                <circle cx="260" cy="40" r="9" style={{ fill: 'var(--color-turquoise)' }} />
              </svg>
            )}

            <p className="onboarding-texto">{actual.texto}</p>
          </>
        )}
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
