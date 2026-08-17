import { useState } from 'react';
import './DetalleRuta.css';

function DetalleRuta({ ruta, sellos, onNavigate }) {
  const [sitioResaltado, setSitioResaltado] = useState(null);

  if (!ruta) {
    return (
      <div className="detalle-wrapper">
        <div className="detalle-contenido">
          <p>Ruta no encontrada.</p>
          <button className="volver-btn" onClick={() => onNavigate?.('rutas')}>
            ← Volver a rutas
          </button>
        </div>
      </div>
    );
  }

  const idsVisitados = new Set(sellos.map(s => s.sitioId));
  const visitados = ruta.sitios.filter(s => idsVisitados.has(s.id)).length;
  const total = ruta.sitios.length;
  const progreso = total > 0 ? Math.round((visitados / total) * 100) : 0;

  return (
    <div className="detalle-wrapper">
      <header className="detalle-header">
        <button className="volver-btn" onClick={() => onNavigate?.('rutas')}>
          ← Volver
        </button>
        <h1>{ruta.nombre}</h1>
        <p className="detalle-ciudad">{ruta.ciudad.toUpperCase()}</p>
      </header>

      <div className="detalle-contenido">
        <div className="detalle-progreso">
          <div className="detalle-progreso-barra">
            <div
              className="detalle-progreso-relleno"
              style={{ width: `${progreso}%` }}
            ></div>
          </div>
          <p>{visitados} de {total} visitados</p>
        </div>

        <h2 className="seccion">SITIOS DE LA RUTA</h2>
        <ul className="detalle-lista">
          {ruta.sitios.map((sitio) => {
            const visitado = idsVisitados.has(sitio.id);
            return (
              <li
                key={sitio.id}
                className={`detalle-sitio ${sitioResaltado === sitio.id ? 'resaltado' : ''}`}
                onClick={() => setSitioResaltado(sitio.id)}
              >
                <span className={`detalle-check ${visitado ? 'visitado' : ''}`}>
                  {visitado ? '✓' : ''}
                </span>
                <div className="detalle-sitio-info">
                  <strong>{sitio.name}</strong>
                  <span>{sitio.desc}</span>
                </div>
              </li>
            );
          })}
        </ul>

        <button className="detalle-accion-btn" onClick={() => onNavigate?.('mapa')}>
          {visitados > 0 ? 'Continuar ruta' : 'Empezar ruta'}
        </button>
      </div>
    </div>
  );
}

export default DetalleRuta;
