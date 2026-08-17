import './DetalleEvento.css';

function formatearFecha(fechaISO) {
  return new Date(`${fechaISO}T00:00:00`).toLocaleDateString('es-NI', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function DetalleEvento({ evento, onNavigate }) {
  if (!evento) {
    return (
      <div className="detalle-evento-wrapper">
        <div className="detalle-evento-contenido">
          <p>Evento no encontrado.</p>
          <button className="volver-btn" onClick={() => onNavigate?.('eventos')}>
            ← Volver a eventos
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="detalle-evento-wrapper">
      <header className="detalle-evento-header">
        <button className="volver-btn" onClick={() => onNavigate?.('eventos')}>
          ← Volver
        </button>
        <h1>{evento.nombre}</h1>
        <p className="detalle-evento-fechas">
          {formatearFecha(evento.fechaInicio)} - {formatearFecha(evento.fechaFin)}
        </p>
      </header>

      <div className="detalle-evento-contenido">
        <div className="detalle-evento-dato">
          <span className="etiqueta">UBICACIÓN</span>
          <p>{evento.ubicacion}</p>
        </div>

        <div className="detalle-evento-dato">
          <span className="etiqueta">DESCRIPCIÓN</span>
          <p>{evento.descripcion}</p>
        </div>

        {evento.sitioRelacionado && (
          <div className="detalle-evento-dato">
            <span className="etiqueta">SITIO RELACIONADO</span>
            <p>{evento.sitioRelacionado}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default DetalleEvento;
