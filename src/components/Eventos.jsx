import './Eventos.css';

function esVigente(evento, hoy) {
  return evento.fechaInicio <= hoy && hoy <= evento.fechaFin;
}

function formatearFecha(fechaISO) {
  return new Date(`${fechaISO}T00:00:00`).toLocaleDateString('es-NI', {
    day: 'numeric',
    month: 'long',
  });
}

function Eventos({ eventos, onNavigate, onSeleccionarEvento }) {
  const hoy = new Date().toISOString().slice(0, 10);

  const eventosVigentes = eventos
    .filter((evento) => esVigente(evento, hoy))
    .sort((a, b) => a.fechaInicio.localeCompare(b.fechaInicio));

  const handleSeleccionar = (eventoId) => {
    onSeleccionarEvento?.(eventoId);
    onNavigate?.('detalleEvento');
  };

  return (
    <div className="eventos-wrapper">
      <header className="eventos-header">
        <button className="volver-btn" onClick={() => onNavigate?.('inicio')}>
          ← Volver
        </button>
        <h1>Agenda de eventos</h1>
      </header>

      <div className="eventos-contenido">
        {eventosVigentes.length === 0 ? (
          <p className="eventos-vacio">Sin eventos activos esta semana</p>
        ) : (
          <div className="card-wrap">
            {eventosVigentes.map((evento) => (
              <div
                key={evento.id}
                className="card destacada"
                onClick={() => handleSeleccionar(evento.id)}
                role="button"
                tabIndex={0}
              >
                <div className="card-img placeholder-b"></div>
                <div className="card-info">
                  <div className="barcode"></div>
                  <div className="guia">GUÍA:<br />Invitado</div>
                  <h3>{evento.nombre}</h3>
                  <div className="ubicacion">{evento.ubicacion.toUpperCase()}</div>
                  <div className="pill">
                    {formatearFecha(evento.fechaInicio)} - {formatearFecha(evento.fechaFin)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Eventos;
