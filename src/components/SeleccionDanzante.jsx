import { useState } from 'react';
import './SeleccionDanzante.css';
import explorador from '../assets/flujo-inicial/explorer_transparente_final.png';
import gigantona from '../assets/flujo-inicial/gigantona.png';

const DANZANTES = [
  {
    valor: 'enano',
    nombre: 'Cabezón',
    texto: 'Pequeño, veloz y curioso. Nunca se pierde una fiesta.',
    imagen: explorador,
  },
  {
    valor: 'gigantona',
    nombre: 'Gigantona',
    texto: 'Elegante y llamativa. Baila por encima de todos.',
    imagen: gigantona,
  },
];

function SeleccionDanzante({ onElegir, onVolverALanding, guardando, error }) {
  const [seleccion, setSeleccion] = useState(null);

  return (
    <div className="danzante-wrapper">
      {onVolverALanding && (
        <button className="danzante-volver" onClick={onVolverALanding} type="button">
          ← Volver al inicio
        </button>
      )}

      <div className="danzante-contenido">
        <span className="danzante-eyebrow">TU DANZANTE</span>
        <h1 className="danzante-titulo">Elige tu compañero de aventura</h1>
        <p className="danzante-sub">Lo vas a personalizar y llevar contigo por toda la ruta.</p>

        <div className="danzante-opciones">
          {DANZANTES.map((d) => (
            <button
              key={d.valor}
              type="button"
              className={`danzante-opcion ${seleccion === d.valor ? 'activa' : ''}`}
              aria-pressed={seleccion === d.valor}
              onClick={() => setSeleccion(d.valor)}
            >
              <span className="danzante-check" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none">
                  <path d="M5 12l5 5 9-11" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <div className="danzante-preview">
                <img src={d.imagen} alt={d.nombre} />
              </div>
              <span className="danzante-nombre">{d.nombre}</span>
              <span className="danzante-texto">{d.texto}</span>
            </button>
          ))}
        </div>

        {error && (
          <p className="danzante-error" role="alert">
            {error}
          </p>
        )}
        <button
          type="button"
          className="danzante-continuar"
          disabled={!seleccion || guardando}
          onClick={() => seleccion && !guardando && onElegir(seleccion)}
        >
          {guardando ? 'Guardando...' : 'Continuar'}
        </button>
      </div>
    </div>
  );
}

export default SeleccionDanzante;
