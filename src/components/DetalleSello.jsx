import './DetalleSello.css';
import { INSIGNIAS } from '../data/insignias';

function DetalleSello({ sitio, sello, onNavigate }) {
  if (!sitio) {
    return (
      <div className="detalle-sello-wrapper">
        <div className="detalle-sello-contenido">
          <p>Sello no encontrado.</p>
          <button className="volver-btn" onClick={() => onNavigate?.('pasaporte')}>
            ← Volver a mis sellos
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="detalle-sello-wrapper">
      <header className="detalle-sello-header">
        <button className="volver-btn" onClick={() => onNavigate?.('pasaporte')}>
          ← Volver
        </button>
        <img className="detalle-sello-icono" src={INSIGNIAS[sitio.badge]} alt={sitio.name} />
        <h1>{sitio.name}</h1>
        {sello && <p className="detalle-sello-fecha">Sellado el {sello.fecha}</p>}
      </header>

      <div className="detalle-sello-contenido">
        <div className="detalle-sello-dato">
          <span className="etiqueta">DESCRIPCIÓN</span>
          <p>{sitio.historia || sitio.desc}</p>
        </div>

        <button className="detalle-sello-accion-btn" onClick={() => onNavigate?.('mapa')}>
          Ver en el mapa
        </button>
        <button className="detalle-sello-secundario-btn" onClick={() => onNavigate?.('pasaporte')}>
          Volver a mis sellos
        </button>
      </div>
    </div>
  );
}

export default DetalleSello;