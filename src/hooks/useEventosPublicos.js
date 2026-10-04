import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

// Eventos que ve el turista, con los nombres de campo que usan Eventos, DetalleEvento e Inicio:
//   { id, nombre, fechaInicio, fechaFin, horaInicio, horaFin,
//     lugar, ubicacion, descripcion, detalles, eslogan, categoria, etiquetas, imagenUrl,
//     sitioRelacionado, negocioId, organizador, tieneSello }
//   organizador (solo actividades de negocios): { id, nombre, logoUrl, categoria, descripcion,
//     telefono, verificado }. "Verificado" = negocio activo con suscripción vigente.
//   ubicacion queda como texto de respaldo para Inicio: el lugar, o el nombre del organizador.
// Lo usan también LandingEventos (landing pública, sin sesión).
//
// Dos fuentes:
// - evento: SOLO los cargados a mano (negocio_organizador_id null). Las filas que crea
//   crear_evento_desde_actividad se toman de la actividad, para no duplicarlas y para
//   que desaparezcan si el negocio vence (evento no tiene ese filtro).
// - actividades_negocio_publicas(): actividades con fechas de negocios visibles (023, 026, 028).
// Los ids llevan prefijo porque las dos tablas tienen ids propios. Para guardar un favorito,
// usar siempre este id (actividad-<id> o evento-<id>), nunca el número de la tabla.
export function useEventosPublicos() {
  const [eventos, setEventos] = useState([]);
  const [cargando, setCargando] = useState(true);

  const recargar = useCallback(async () => {
    const [resEventos, resActividades] = await Promise.all([
      supabase
        .from('evento')
        .select('id, nombre, fecha_inicio, fecha_fin, ubicacion, descripcion, imagen_url, categoria, categoria_otro, hora_inicio, hora_fin, eslogan, detalles, etiquetas, sitio:sitio_relacionado_id (nombre)')
        .is('negocio_organizador_id', null),
      supabase.rpc('actividades_negocio_publicas'),
    ]);

    if (resEventos.error) console.error('Error cargando eventos:', resEventos.error);
    if (resActividades.error) console.error('Error cargando actividades públicas:', resActividades.error);

    const actividades = resActividades.data || [];

    // Datos del organizador (la función solo trae negocio_id). La política de negocio ya deja
    // leer los activos y vigentes, que son los mismos que filtra la función.
    let organizadores = new Map();
    const idsNegocio = [...new Set(actividades.map((a) => a.negocio_id))];
    if (idsNegocio.length > 0) {
      const { data, error } = await supabase
        .from('negocio')
        .select('id, nombre_negocio, categoria, descripcion, telefono, logo_url, estado, fecha_vencimiento_suscripcion')
        .in('id', idsNegocio);
      if (error) console.error('Error cargando negocios de las actividades:', error);
      organizadores = new Map((data || []).map((n) => [n.id, {
        id: n.id,
        nombre: n.nombre_negocio,
        logoUrl: n.logo_url || null,
        categoria: n.categoria,
        descripcion: n.descripcion,
        telefono: n.telefono,
        verificado: n.estado === 'activo'
          && Boolean(n.fecha_vencimiento_suscripcion)
          && new Date(n.fecha_vencimiento_suscripcion) > new Date(),
      }]));
    }

    const manuales = (resEventos.data || []).map((e) => ({
      id: `evento-${e.id}`,
      nombre: e.nombre,
      fechaInicio: e.fecha_inicio,
      fechaFin: e.fecha_fin,
      horaInicio: e.hora_inicio || null,
      horaFin: e.hora_fin || null,
      lugar: e.ubicacion || '',
      ubicacion: e.ubicacion || '',
      descripcion: e.descripcion || '',
      detalles: e.detalles || '',
      eslogan: e.eslogan || '',
      categoria: e.categoria || null,
      categoriaOtro: e.categoria_otro || null,
      etiquetas: e.etiquetas || [],
      sitioRelacionado: e.sitio?.nombre || null,
      imagenUrl: e.imagen_url || null,
      negocioId: null,
      organizador: null,
      tieneSello: false,
    }));

    const deNegocios = actividades.map((a) => {
      const organizador = organizadores.get(a.negocio_id) || null;
      return {
        id: `actividad-${a.id}`,
        nombre: a.nombre,
        fechaInicio: a.fecha_inicio,
        fechaFin: a.fecha_fin,
        horaInicio: a.hora_inicio || null,
        horaFin: a.hora_fin || null,
        lugar: a.lugar || '',
        ubicacion: a.lugar || organizador?.nombre || '',
        descripcion: a.descripcion || '',
        detalles: a.detalles || '',
        eslogan: a.eslogan || '',
        categoria: a.categoria || null,
        categoriaOtro: a.categoria_otro || null,
        etiquetas: a.etiquetas || [],
        sitioRelacionado: null,
        imagenUrl: a.foto_url || null,
        negocioId: a.negocio_id,
        organizador,
        tieneSello: a.estado_sello === 'aprobado',
      };
    });

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
