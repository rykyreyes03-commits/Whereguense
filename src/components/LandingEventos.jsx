import { useState } from 'react';
import './LandingEventos.css';
import LandingNavbar from './LandingNavbar';
import { useEventosPublicos } from '../hooks/useEventosPublicos';
import { diaDeFin, hoyManagua, sumarDias } from '../utils/eventos';

// Rango de días 'YYYY-MM-DD' de la vista, a partir de la fecha de Managua (la misma que usa Eventos), no la del teléfono.
function rangoDeVista(vista) {
  const hoy = hoyManagua();
  if (vista === 'semana') return [hoy, sumarDias(hoy, 6)];
  const [y, m] = hoy.split('-').map(Number);
  const ultimo = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const mes = `${y}-${String(m).padStart(2, '0')}`;
  return [`${mes}-01`, `${mes}-${String(ultimo).padStart(2, '0')}`];
}
// Fechas 'YYYY-MM-DD' como día local: new Date('2026-10-05') es medianoche UTC,
// que en Nicaragua (UTC-6) cae el día anterior.
function fechaLocal(fechaISO) {
  return new Date(`${fechaISO}T00:00:00`);
}
function seSuperponen(evento, inicioRango, finRango) {
  // una nocturna que termina de madrugada llega hasta el día siguiente: se usa su último día real
  return evento.fechaInicio <= finRango && (diaDeFin(evento) || evento.fechaFin) >= inicioRango;
}
function formatearRango(fechaInicio, fechaFin) {
  const opciones = { day: 'numeric', month: 'long' };
  const ini = fechaLocal(fechaInicio).toLocaleDateString('es-NI', opciones);
  const fin = fechaLocal(fechaFin).toLocaleDateString('es-NI', opciones);
  return fechaInicio === fechaFin ? ini : `${ini} – ${fin}`;
}

function LandingEventos({ onNavigate, onComenzar }) {
  // Mismo criterio que la app: eventos cargados a mano + actividades de negocios
  // visibles (activos y vigentes). Un negocio vencido no aparece aquí.
  const { eventos, cargando } = useEventosPublicos();
  const [vista, setVista] = useState('semana'); // 'semana' | 'mes'

  const [inicioRango, finRango] = rangoDeVista(vista);
  const eventosFiltrados = eventos.filter((e) => seSuperponen(e, inicioRango, finRango));

  return (
    <div className="landing">
      <LandingNavbar activo="landingEventos" onNavigate={onNavigate} onComenzar={onComenzar} />

      <section className="le-hero">
        <div className="le-hero-inner">
          <h1>Eventos</h1>
          <div className="le-toggle">
            <button
              className={`le-toggle-btn ${vista === 'semana' ? 'le-toggle-btn--activo' : ''}`}
              onClick={() => setVista('semana')}
              type="button"
            >
              Esta semana
            </button>
            <button
              className={`le-toggle-btn ${vista === 'mes' ? 'le-toggle-btn--activo' : ''}`}
              onClick={() => setVista('mes')}
              type="button"
            >
              Este mes
            </button>
          </div>
        </div>
      </section>

      <section className="le-lista">
        <div className="le-lista-inner">
          {cargando && <p className="le-estado">Cargando eventos…</p>}

          {!cargando && eventosFiltrados.length === 0 && (
            <p className="le-estado">
              No hay eventos {vista === 'semana' ? 'esta semana' : 'este mes'} todavía. Vuelve pronto.
            </p>
          )}

          {eventosFiltrados.map((evento) => (
            <article key={evento.id} className="le-card">
              {evento.imagenUrl && (
                <img className="le-card-img" src={evento.imagenUrl} alt={evento.nombre} />
              )}
              <div className="le-card-texto">
                <h2>{evento.nombre}</h2>
                <span className="le-card-etiqueta">{evento.negocioId ? 'Actividad' : 'Recorrido'}</span>
                {evento.descripcion && <p className="le-card-desc">{evento.descripcion}</p>}
                <p className="le-card-fecha">{formatearRango(evento.fechaInicio, evento.fechaFin)}</p>
                {evento.ubicacion && <p className="le-card-ubicacion">📍 {evento.ubicacion}</p>}
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

export default LandingEventos;
