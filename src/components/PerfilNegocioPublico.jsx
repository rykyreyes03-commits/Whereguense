import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import '../components/HistoriaSitio.css';
import './PerfilNegocioPublico.css';

const NOMBRES_DIA = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

function PerfilNegocioPublico({ negocio, onCerrar }) {
  const [horarios, setHorarios] = useState([]);
  const [fotos, setFotos] = useState([]);
  const [productos, setProductos] = useState([]);

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
        <p className="historia-sitio-texto">
          {negocio.descripcion || 'Este negocio aún no agregó una descripción.'}
        </p>
        {negocio.telefono && (
          <p className="perfilpublico-telefono">📞 {negocio.telefono}</p>
        )}
        {fotos.length > 0 && (
          <div className="perfilpublico-fotos">
            {fotos.map((f, i) => (
              <img key={i} src={f.url} alt={`Foto ${i + 1} de ${negocio.name}`} />
            ))}
          </div>
        )}
        {horarios.length > 0 && (
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
        )}
        {productos.length > 0 && (
          <div className="perfilpublico-productos">
            {productos.map((p) => (
              <span key={p.id} className="perfilpublico-producto-chip">
                {p.nombre}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default PerfilNegocioPublico;
