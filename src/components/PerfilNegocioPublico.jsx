import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, MapPin, MessageCircle, Phone, Stamp, X } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import SeccionResenas from './SeccionResenas';
import LineaResenas from './LineaResenas';
import MiniMapaNegocio from './MiniMapaNegocio';
import { useAhora } from '../hooks/useAhora';
import { disenoDesdeConfig, enlaceWhatsapp, tieneCoordenadas, variablesFicha } from '../utils/diseno';
import { estadoAbierto, resumenHorarios } from '../utils/horarios';
import '../components/HistoriaSitio.css';
import './PerfilNegocioPublico.css';

function formatearFecha(fechaISO) {
  return new Date(`${fechaISO}T00:00:00`).toLocaleDateString('es-NI', { day: 'numeric', month: 'short' });
}

function rangoFechas(a) {
  return a.fecha_inicio === a.fecha_fin
    ? formatearFecha(a.fecha_inicio)
    : `${formatearFecha(a.fecha_inicio)} – ${formatearFecha(a.fecha_fin)}`;
}

// Ficha pública del negocio. Lee negocio.config_diseno (paleta, letra, logo, portada, orden y visibilidad de secciones,
// WhatsApp y layout de productos/fotos). Sin logo en el diseño usa el logo de siempre (negocio.logo_url) y, sin ninguno, la inicial.
function PerfilNegocioPublico({ negocio, onCerrar, vistaPrevia = false, onVerEnMapa = null }) {
  const [horarios, setHorarios] = useState([]);
  const [fotos, setFotos] = useState([]);
  const [productos, setProductos] = useState([]);
  const [actividades, setActividades] = useState([]);
  const [fila, setFila] = useState(null); // { config_diseno, logo_url, latitud, longitud } publicados
  const [portadaRota, setPortadaRota] = useState(null);
  const ahora = useAhora();

  useEffect(() => {
    if (!negocio?.id) {
      setFila(null);
      return undefined;
    }
    let activo = true;
    supabase
      .from('negocio')
      .select('config_diseno, logo_url, latitud, longitud')
      .eq('id', negocio.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!activo) return;
        if (error) console.error('Error cargando el diseño del negocio:', error);
        setFila(error ? null : data);
      });
    return () => { activo = false; };
  }, [negocio?.id]);

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
      .order('id')
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

  const diseno = useMemo(() => disenoDesdeConfig(fila?.config_diseno), [fila]);
  const estado = useMemo(() => estadoAbierto(horarios, ahora), [horarios, ahora]);
  const resumen = useMemo(() => resumenHorarios(horarios), [horarios]);

  if (!negocio) return null;

  const logo = diseno.logoUrl || fila?.logo_url;
  // Texto plano: se dibuja como texto (React lo escapa), nunca como HTML. Sin descripción en el diseño, la del perfil de siempre.
  const descripcion = (diseno.descripcion || negocio.descripcion || '').trim();
  const inicial = (negocio.name || '?').trim().charAt(0).toUpperCase();
  const portada = diseno.portadaUrl && portadaRota !== diseno.portadaUrl ? diseno.portadaUrl : null;
  const whatsapp = enlaceWhatsapp(diseno.whatsapp);
  const conCoordenadas = tieneCoordenadas(fila?.latitud, fila?.longitud);
  const verResenas = diseno.secciones.includes('resenas');
  const clase = (base) => `${base} perfilpublico-${diseno.layoutProductos}`;

  const secciones = {
    horarios: resumen.length > 0 && (
      <div className="perfilpublico-card" key="horarios">
        <h3 className="perfilpublico-seccion-titulo">Horarios</h3>
        <ul className="perfilpublico-horarios">
          {resumen.map((g) => (
            <li key={g.dias}>
              <span>{g.dias}</span>
              <strong>{g.horas}</strong>
            </li>
          ))}
        </ul>
      </div>
    ),
    productos: productos.length > 0 && (
      <div className="perfilpublico-card" key="productos">
        <h3 className="perfilpublico-seccion-titulo">Productos</h3>
        <div className={clase('perfilpublico-productos')}>
          {productos.map((p) => (
            <span key={p.id} className="perfilpublico-producto-chip">{p.nombre}</span>
          ))}
        </div>
      </div>
    ),
    fotos: fotos.length > 0 && (
      <div className="perfilpublico-card" key="fotos">
        <h3 className="perfilpublico-seccion-titulo">Fotos</h3>
        <div className={clase('perfilpublico-fotos')}>
          {fotos.map((f, i) => (
            <img key={i} src={f.url} alt={`Foto ${i + 1} de ${negocio.name}`} loading="lazy" />
          ))}
        </div>
      </div>
    ),
    actividades: actividades.length > 0 && (
      <div className="perfilpublico-card" key="actividades">
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
    ),
    ubicacion: conCoordenadas && (
      <div className="perfilpublico-card" key="ubicacion">
        <h3 className="perfilpublico-seccion-titulo">Cómo llegar</h3>
        <MiniMapaNegocio lat={Number(fila.latitud)} lng={Number(fila.longitud)} nombre={negocio.name} />
        {onVerEnMapa && (
          <button
            type="button"
            className="perfilpublico-como-llegar"
            onClick={() => {
              onCerrar?.();
              onVerEnMapa(negocio.id);
            }}
          >
            <MapPin size={18} strokeWidth={2} aria-hidden="true" /> Ver en el mapa
          </button>
        )}
      </div>
    ),
    resenas: (
      <SeccionResenas key="resenas" negocioId={negocio.id} nombreNegocio={negocio.name} vistaPrevia={vistaPrevia} />
    ),
  };

  return (
    <div
      className="historia-sitio perfilpublico-ficha"
      style={variablesFicha(diseno)}
    >
      <div className="perfilpublico-portada">
        {portada && (
          <img src={portada} alt="" className="perfilpublico-portada-foto" onError={() => setPortadaRota(portada)} />
        )}
        <span className="perfilpublico-marca">Wheregüense</span>
        <button type="button" className="historia-sitio-cerrar" onClick={onCerrar} aria-label="Cerrar">
          <X size={18} strokeWidth={2.4} aria-hidden="true" />
        </button>
      </div>

      <div className="historia-sitio-contenido perfilpublico-contenido">
        <div className="perfilpublico-identidad">
          <span className="perfilpublico-logo">
            {logo ? <img src={logo} alt="" /> : inicial}
          </span>
          <h2 className="perfilpublico-nombre">{negocio.name}</h2>
        </div>

        {descripcion && <p className="perfilpublico-descripcion">{descripcion}</p>}

        <div className="perfilpublico-pastillas">
          {negocio.categoria && <span className="perfilpublico-pastilla">{negocio.categoria}</span>}
          {estado && (
            <span className={`perfilpublico-pastilla ${estado.abierto ? 'perfilpublico-pastilla--abierto' : ''}`}>
              {estado.texto}
            </span>
          )}
          {verResenas && (
            <span className="perfilpublico-pastilla"><LineaResenas negocioId={negocio.id} /></span>
          )}
        </div>

        {whatsapp && (
          <a className="perfilpublico-whatsapp" href={whatsapp} target="_blank" rel="noopener noreferrer">
            <MessageCircle size={20} strokeWidth={2} aria-hidden="true" /> Escribir por WhatsApp
          </a>
        )}

        {negocio.telefono && (
          <div className="perfilpublico-card">
            <p className="perfilpublico-telefono perfilpublico-telefono--solo">
              <Phone size={16} strokeWidth={2} aria-hidden="true" /> {negocio.telefono}
            </p>
          </div>
        )}

        {diseno.secciones.map((id) => secciones[id] || null)}
      </div>
    </div>
  );
}

export default PerfilNegocioPublico;
