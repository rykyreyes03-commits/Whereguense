import { useEffect, useState } from 'react';
import { CalendarDays, Stamp } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import SeccionResenas from './SeccionResenas';
import '../components/HistoriaSitio.css';
import './PerfilNegocioPublico.css';

const NOMBRES_DIA = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

function formatearFecha(fechaISO) {
  return new Date(`${fechaISO}T00:00:00`).toLocaleDateString('es-NI', { day: 'numeric', month: 'short' });
}

function rangoFechas(a) {
  return a.fecha_inicio === a.fecha_fin
    ? formatearFecha(a.fecha_inicio)
    : `${formatearFecha(a.fecha_inicio)} – ${formatearFecha(a.fecha_fin)}`;
}

function PerfilNegocioPublico({ negocio, onCerrar, vistaPrevia = false }) {
  const [horarios, setHorarios] = useState([]);
  const [fotos, setFotos] = useState([]);
  const [productos, setProductos] = useState([]);
  const [actividades, setActividades] = useState([]);

  useEffect(() => {
    if (!negocio?.id) {
      setHorarios([]);
      return undefined;
    }
    let activo = true;
    supabase
      .from('negocio_horario')
      .select('dia_semana, hora_apertura, hora_cierre, cerrado')
      .eq('negocio_id', negocio.id)
      .order('dia_semana')
      .then(({ data, error }) => {
        if (!activo) return;
        if (error) {
          console.error('Error cargando horarios públicos:', error);
          setHorarios([]);
        } else {
          setHorarios(data || []);
        }
      });
    return () => { activo = false; };
  }, [negocio?.id]);

  useEffect(() => {
    if (!negocio?.id) {
      setFotos([]);
      return undefined;
    }
    let activo = true;
    supabase
      .from('negocio_foto')
      .select('url')
      .eq('negocio_id', negocio.id)
      .order('orden')
      .then(({ data, error }) => {
        if (!activo) return;
        if (error) {
          console.error('Error cargando fotos públicas:', error);
          setFotos([]);
        } else {
          setFotos(data || []);
        }
      });
    return () => { activo = false; };
  }, [negocio?.id]);

  useEffect(() => {
    if (!negocio?.id) {
      setProductos([]);
      return undefined;
    }
    let activo = true;
    supabase
      .from('producto')
      .select('id, nombre, orden')
      .eq('negocio_id', negocio.id)
      .order('orden')
      .then(({ data, error }) => {
        if (!activo) return;
        if (error) {
          console.error('Error cargando productos públicos:', error);
          setProductos([]);
        } else {
          setProductos(data || []);
        }
      });
    return () => { activo = false; };
  }, [negocio?.id]);

  // Actividades vigentes y próximas de este negocio. La función pública ya filtra
  // "con fechas" y "negocio visible" (023); aquí, el negocio y que no hayan terminado.
  useEffect(() => {
    if (!negocio?.id) {
      setActividades([]);
      return undefined;
    }
    let activo = true;
    const hoy = new Date().toISOString().slice(0, 10);
    supabase
      .rpc('actividades_negocio_publicas')
      .eq('negocio_id', negocio.id)
      .gte('fecha_fin', hoy)
      .then(({ data, error }) => {
        if (!activo) return;
        if (error) {
          console.error('Error cargando actividades públicas:', error);
          setActividades([]);
        } else {
          setActividades(data || []);
        }
      });
    return () => { activo = false; };
  }, [negocio?.id]);

  if (!negocio) return null;

  return (
    <div className="historia-sitio">
      <div className="historia-sitio-hero">
        <button
          type="button"
          className="historia-sitio-cerrar"
          onClick={onCerrar}
          aria-label="Cerrar"
        >
          ×
        </button>
        <h2 className="historia-sitio-nombre">{negocio.name}</h2>
        <p className="perfilpublico-categoria">{negocio.categoria}</p>
      </div>

      <div className="historia-sitio-contenido">
        <div className="perfilpublico-card">
          <p className="historia-sitio-texto">
            {negocio.descripcion || 'Este negocio aún no agregó una descripción.'}
          </p>
          {negocio.telefono && (
            <p className="perfilpublico-telefono">📞 {negocio.telefono}</p>
          )}
        </div>

        <SeccionResenas negocioId={negocio.id} nombreNegocio={negocio.name} vistaPrevia={vistaPrevia} />

        {actividades.length > 0 && (
          <div className="perfilpublico-card">
            <h3 className="perfilpublico-seccion-titulo">Actividades</h3>
            <ul className="perfilpublico-actividades">
              {actividades.map((a) => (
                <li key={a.id}>
                  <strong>{a.nombre}</strong>
                  <span className="perfilpublico-actividad-fecha">
                    <CalendarDays size={14} strokeWidth={2} aria-hidden="true" /> {rangoFechas(a)}
                  </span>
                  {a.descripcion && <p>{a.descripcion}</p>}
                  {a.estado_sello === 'aprobado' && (
                    <span className="perfilpublico-actividad-sello">
                      <Stamp size={14} strokeWidth={2} aria-hidden="true" /> Entrega sello
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {fotos.length > 0 && (
          <div className="perfilpublico-card">
            <h3 className="perfilpublico-seccion-titulo">Fotos</h3>
            <div className="perfilpublico-fotos">
              {fotos.map((f, i) => (
                <img key={i} src={f.url} alt={`Foto ${i + 1} de ${negocio.name}`} />
              ))}
            </div>
          </div>
        )}

        {horarios.length > 0 && (
          <div className="perfilpublico-card">
            <h3 className="perfilpublico-seccion-titulo">Horarios</h3>
            <ul className="perfilpublico-horarios">
              {horarios.map((h) => (
                <li key={h.dia_semana}>
                  <span>{NOMBRES_DIA[h.dia_semana]}</span>
                  <strong>
                    {h.cerrado ? 'Cerrado' : `${h.hora_apertura?.slice(0, 5)} – ${h.hora_cierre?.slice(0, 5)}`}
                  </strong>
                </li>
              ))}
            </ul>
          </div>
        )}

        {productos.length > 0 && (
          <div className="perfilpublico-card">
            <h3 className="perfilpublico-seccion-titulo">Productos</h3>
            <div className="perfilpublico-productos">
              {productos.map((p) => (
                <span key={p.id} className="perfilpublico-producto-chip">
                  {p.nombre}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default PerfilNegocioPublico;
