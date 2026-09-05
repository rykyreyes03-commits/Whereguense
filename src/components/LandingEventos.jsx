import { useEffect, useState } from 'react';
import './LandingEventos.css';
import LandingNavbar from './LandingNavbar';
import { supabase } from '../lib/supabaseClient';

function inicioDeHoy() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}
function finDeSemana() {
  const d = inicioDeHoy();
  d.setDate(d.getDate() + 6);
  d.setHours(23, 59, 59, 999);
  return d;
}
function inicioDeMes() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function finDeMes() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
}
function seSuperponen(evento, inicioRango, finRango) {
  const ei = new Date(evento.fecha_inicio);
  const ef = new Date(evento.fecha_fin);
  return ei <= finRango && ef >= inicioRango;
}
function formatearRango(fechaInicio, fechaFin) {
  const opciones = { day: 'numeric', month: 'long' };
  const ini = new Date(fechaInicio).toLocaleDateString('es-NI', opciones);
  const fin = new Date(fechaFin).toLocaleDateString('es-NI', opciones);
  return fechaInicio === fechaFin ? ini : `${ini} – ${fin}`;
}

function LandingEventos({ onNavigate, onComenzar }) {
  const [eventos, setEventos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [vista, setVista] = useState('semana'); // 'semana' | 'mes'

  useEffect(() => {
    let activo = true;
    supabase
      .from('evento')
      .select('*')
      .order('fecha_inicio')
      .then(({ data, error }) => {
        if (!activo) return;
        if (error) {
          console.error('Error cargando eventos:', error);
          setEventos([]);
        } else {
          setEventos(data || []);
        }
        setCargando(false);
      });
    return () => { activo = false; };
  }, []);

  const inicioRango = vista === 'semana' ? inicioDeHoy() : inicioDeMes();
  const finRango = vista === 'semana' ? finDeSemana() : finDeMes();
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
              {evento.imagen_url && (
                <img className="le-card-img" src={evento.imagen_url} alt={evento.nombre} />
              )}
              <div className="le-card-texto">
                <h2>{evento.nombre}</h2>
                <span className="le-card-etiqueta">Recorrido</span>
                {evento.descripcion && <p className="le-card-desc">{evento.descripcion}</p>}
                <p className="le-card-fecha">{formatearRango(evento.fecha_inicio, evento.fecha_fin)}</p>
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
