import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import '../components/HistoriaSitio.css';
import './PerfilNegocioPublico.css';

const NOMBRES_DIA = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

function PerfilNegocioPublico({ negocio, onCerrar }) {
  const [horarios, setHorarios] = useState([]);

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
        <p className="perfilpublico-nota">
          Fotos y productos próximamente.
        </p>
      </div>
    </div>
  );
}

export default PerfilNegocioPublico;
