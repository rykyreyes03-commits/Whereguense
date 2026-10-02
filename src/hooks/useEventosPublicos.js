import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

// Eventos que ve el turista, con los nombres de campo que usan Eventos, DetalleEvento
// e Inicio (camelCase, como el viejo src/data/eventos.js):
//   { id, nombre, fechaInicio, fechaFin, ubicacion, descripcion, sitioRelacionado,
//     imagenUrl, negocioId, tieneSello }
// Lo usan también LandingEventos (landing pública, sin sesión).
//
// Dos fuentes:
// - evento: SOLO los cargados a mano (negocio_organizador_id null). Las filas que crea
//   crear_evento_desde_actividad se toman de la actividad, para no duplicarlas y para
//   que desaparezcan si el negocio vence (evento no tiene ese filtro).
// - actividades_negocio_publicas(): actividades con fechas de negocios visibles (023).
// Los ids llevan prefijo porque las dos tablas tienen ids propios.
export function useEventosPublicos() {
  const [eventos, setEventos] = useState([]);
  const [cargando, setCargando] = useState(true);

  const recargar = useCallback(async () => {
    const [resEventos, resActividades] = await Promise.all([
      supabase
        .from('evento')
        .select('id, nombre, fecha_inicio, fecha_fin, ubicacion, descripcion, imagen_url, sitio:sitio_relacionado_id (nombre)')
        .is('negocio_organizador_id', null),
      supabase.rpc('actividades_negocio_publicas'),
    ]);

    if (resEventos.error) console.error('Error cargando eventos:', resEventos.error);
    if (resActividades.error) console.error('Error cargando actividades públicas:', resActividades.error);

    const actividades = resActividades.data || [];

    // Nombre del negocio como ubicación (la función no lo trae). La política de
    // negocio ya deja leer los activos y vigentes, que son los mismos que filtra la función.
    let nombresNegocio = new Map();
    const idsNegocio = [...new Set(actividades.map((a) => a.negocio_id))];
    if (idsNegocio.length > 0) {
      const { data, error } = await supabase
        .from('negocio')
        .select('id, nombre_negocio')
        .in('id', idsNegocio);
      if (error) console.error('Error cargando negocios de las actividades:', error);
      nombresNegocio = new Map((data || []).map((n) => [n.id, n.nombre_negocio]));
    }

    const manuales = (resEventos.data || []).map((e) => ({
      id: `evento-${e.id}`,
      nombre: e.nombre,
      fechaInicio: e.fecha_inicio,
      fechaFin: e.fecha_fin,
      ubicacion: e.ubicacion || '',
      descripcion: e.descripcion || '',
      sitioRelacionado: e.sitio?.nombre || null,
      imagenUrl: e.imagen_url || null,
      negocioId: null,
      tieneSello: false,
    }));

    const deNegocios = actividades.map((a) => ({
      id: `actividad-${a.id}`,
      nombre: a.nombre,
      fechaInicio: a.fecha_inicio,
      fechaFin: a.fecha_fin,
      ubicacion: nombresNegocio.get(a.negocio_id) || '',
      descripcion: a.descripcion || '',
      sitioRelacionado: null,
      imagenUrl: null,
      negocioId: a.negocio_id,
      tieneSello: a.estado_sello === 'aprobado',
    }));

    setEventos(
      [...manuales, ...deNegocios].sort((x, y) => x.fechaInicio.localeCompare(y.fechaInicio))
    );
    setCargando(false);
  }, []);

  useEffect(() => {
    recargar();
  }, [recargar]);

  return { eventos, cargando, recargar };
}
