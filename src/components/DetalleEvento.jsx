import { useState } from 'react';
import './DetalleEvento.css';

function formatearFecha(fechaISO) {
  return new Date(`${fechaISO}T00:00:00`).toLocaleDateString('es-NI', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function DetalleEvento({ evento, onNavigate }) {
  // URL de portada que falló al cargar: se vuelve al encabezado de siempre, sin foto.
  const [portadaFallida, setPortadaFallida] = useState(null);

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

  const conPortada = Boolean(evento.imagenUrl) && portadaFallida !== evento.imagenUrl;

  return (
    <div className="detalle-evento-wrapper">
      {conPortada ? (
        // Tarjeta de invitación: foto de fondo, degradado oscuro abajo y el nombre encima.
        <header className="detalle-evento-header detalle-evento-header--foto">
          <img
            className="detalle-evento-portada"
            src={evento.imagenUrl}
            alt=""
            onError={() => setPortadaFallida(evento.imagenUrl)}
          />
          <button className="volver-btn" onClick={() => onNavigate?.('eventos')}>
            ← Volver
          </button>
          <div className="detalle-evento-portada-texto">
            <h1>{evento.nombre}</h1>
            <p className="detalle-evento-fechas">
              {formatearFecha(evento.fechaInicio)} - {formatearFecha(evento.fechaFin)}
            </p>
          </div>
        </header>
      ) : (
        <header className="detalle-evento-header">
          <button className="volver-btn" onClick={() => onNavigate?.('eventos')}>
            ← Volver
          </button>
          <h1>{evento.nombre}</h1>
          <p className="detalle-evento-fechas">
            {formatearFecha(evento.fechaInicio)} - {formatearFecha(evento.fechaFin)}
          </p>
        </header>
      )}

      <div className="detalle-evento-contenido">
        {evento.ubicacion && (
          <div className="detalle-evento-dato">
            <span className="etiqueta">{evento.negocioId ? 'ORGANIZA' : 'UBICACIÓN'}</span>
            <p>{evento.ubicacion}</p>
          </div>
        )}

        {evento.descripcion && (
          <div className="detalle-evento-dato">
            <span className="etiqueta">DESCRIPCIÓN</span>
            <p>{evento.descripcion}</p>
          </div>
        )}

        {evento.tieneSello && (
          <div className="detalle-evento-dato">
            <span className="etiqueta">SELLO</span>
            <p>Esta actividad entrega un sello: escanea el QR en el negocio.</p>
          </div>
        )}

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
