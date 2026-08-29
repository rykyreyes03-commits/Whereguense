import { useState } from 'react';
import './Proposito.css';
import iconoTurismo from '../assets/flujo-inicial/tourism_hd_choke.png';
import iconoEmprendimiento from '../assets/flujo-inicial/entrepreneurship_hd_choke.png';

const OPCIONES = [
  {
    valor: 'turismo',
    titulo: 'Turista',
    texto: 'Quiero explorar León, sellar mi pasaporte y coleccionar cultura.',
    imagen: iconoTurismo,
  },
  {
    valor: 'emprendimiento',
    titulo: 'Emprendedor',
    texto: 'Tengo un negocio local y quiero mostrarlo a quienes visitan la ciudad.',
    imagen: iconoEmprendimiento,
  },
];

function Proposito({ onElegir, onVolverALanding }) {
  const [seleccion, setSeleccion] = useState(null);

  return (
    <div className="proposito-wrapper">
      {onVolverALanding && (
        <button className="proposito-volver" onClick={onVolverALanding} type="button">
          ← Volver al inicio
        </button>
      )}

      <div className="proposito-contenido">
        <span className="proposito-eyebrow">PRIMER PASO</span>
        <h1 className="proposito-titulo">¿Qué te trae a Wheregüense?</h1>
        <p className="proposito-sub">Elige una opción para personalizar tu experiencia.</p>

        <div className="proposito-opciones">
          {OPCIONES.map((op) => (
            <button
              key={op.valor}
              type="button"
              className={`proposito-opcion ${seleccion === op.valor ? 'activa' : ''}`}
              aria-pressed={seleccion === op.valor}
              onClick={() => setSeleccion(op.valor)}
            >
              <span className="proposito-check" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none">
                  <path d="M5 12l5 5 9-11" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <img src={op.imagen} alt="" />
              <span className="proposito-opcion-titulo">{op.titulo}</span>
              <span className="proposito-opcion-texto">{op.texto}</span>
            </button>
          ))}
        </div>

        <button
          type="button"
          className="proposito-continuar"
          disabled={!seleccion}
          onClick={() => seleccion && onElegir(seleccion)}
        >
          Continuar
        </button>
      </div>
    </div>
  );
}

export default Proposito;
