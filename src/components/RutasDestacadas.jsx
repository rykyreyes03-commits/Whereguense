import './RutasDestacadas.css';

function contarVisitados(ruta, sellos) {
  const idsSitios = new Set(ruta.sitios.map(s => s.id));
  return sellos.filter(s => idsSitios.has(s.sitioId)).length;
}

function RutasDestacadas({ rutas, sellos, onNavigate, onSeleccionarRuta }) {
  const handleSeleccionar = (rutaId) => {
    onSeleccionarRuta?.(rutaId);
    onNavigate?.('detalleRuta');
  };

  return (
    <div className="rutas-wrapper">
      <header className="rutas-header">
        <button className="volver-btn" onClick={() => onNavigate?.('inicio')}>
          ← Volver
        </button>
        <h1>Rutas destacadas</h1>
      </header>

      <div className="rutas-contenido">
        <div className="card-wrap">
          {rutas.map((ruta) => {
            const visitados = contarVisitados(ruta, sellos);
            return (
              <div
                key={ruta.id}
                className="card"
                onClick={() => handleSeleccionar(ruta.id)}
                role="button"
                tabIndex={0}
              >
                <div className="card-img placeholder-a"></div>
                <div className="card-info">
                  <div className="barcode"></div>
                  <div className="guia">GUÍA:<br />Invitado</div>
                  <h3>{ruta.nombre}</h3>
                  <div className="ubicacion">{ruta.ciudad.toUpperCase()}</div>
                  <div className="pill">{ruta.sitios.length} sitios</div>
                  {visitados > 0 && (
                    <div className="progreso-ruta">
                      {visitados} de {ruta.sitios.length} visitados
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default RutasDestacadas;
