import { useEffect } from 'react';
import './Eventos.css';
import TopBar from './TopBar';
import BottomNav from './BottomNav';

// Vigentes y próximos: todo lo que todavía no terminó.
function noTermino(evento, hoy) {
  return hoy <= evento.fechaFin;
}

function formatearFecha(fechaISO) {
  return new Date(`${fechaISO}T00:00:00`).toLocaleDateString('es-NI', {
    day: 'numeric',
    month: 'long',
  });
}

function Eventos({ eventos, cargando, onRecargar, onNavigate, onSeleccionarEvento }) {
  const hoy = new Date().toISOString().slice(0, 10);

  // Al entrar: traer de nuevo (actividades recién creadas por los negocios).
  useEffect(() => {
    onRecargar?.();
  }, [onRecargar]);

  const eventosVigentes = eventos
    .filter((evento) => noTermino(evento, hoy))
    .sort((a, b) => a.fechaInicio.localeCompare(b.fechaInicio));

  const handleSeleccionar = (eventoId) => {
    onSeleccionarEvento?.(eventoId);
    onNavigate?.('detalleEvento');
  };

  return (
    <div className="eventos-wrapper">
      <TopBar title="Agenda de eventos" onMenuClick={() => onNavigate?.('menu')} />

      <div className="eventos-contenido">
        {cargando && eventosVigentes.length === 0 ? (
          <p className="eventos-vacio">Cargando eventos…</p>
        ) : eventosVigentes.length === 0 ? (
          <p className="eventos-vacio">No hay eventos próximos por ahora</p>
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
                  {evento.ubicacion && <div className="ubicacion">{evento.ubicacion.toUpperCase()}</div>}
                  <div className="pill">
                    {formatearFecha(evento.fechaInicio)} - {formatearFecha(evento.fechaFin)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <BottomNav activo="eventos" onNavigate={onNavigate} />
    </div>
  );
}

export default Eventos;