import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

function mapearNegocioAdmin(fila) {
  return {
    id: fila.id,
    nombre: fila.nombre_negocio,
    categoria: fila.categoria,
    responsable: fila.responsable,
    telefono: fila.telefono,
    fechaEnvio: fila.fecha_envio,
    estado: fila.estado,
  };
}

function mapearSolicitudSello(fila) {
  return {
    id: fila.id,
    nombre: fila.nombre,
    descripcion: fila.descripcion,
    fechaInicio: fila.fecha_inicio,
    fechaFin: fila.fecha_fin,
    justificacion: fila.justificacion_sello,
    fechaCreacion: fila.fecha_creacion,
    negocio: fila.negocio?.nombre_negocio || 'Negocio sin nombre',
  };
}

export function useAdmin() {
  const [pendientes, setPendientes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [solicitudesSello, setSolicitudesSello] = useState([]);
  const [cargandoSellos, setCargandoSellos] = useState(true);

  const cargarPendientes = useCallback(async () => {
    setCargando(true);
    const { data, error } = await supabase
      .from('negocio')
      .select('id, nombre_negocio, categoria, responsable, telefono, fecha_envio, estado')
      .eq('estado', 'pendiente')
      .order('fecha_envio');

    setCargando(false);
    if (error) {
      console.error('Error cargando negocios pendientes:', error);
      setPendientes([]);
      return;
    }
    setPendientes((data || []).map(mapearNegocioAdmin));
  }, []);

  // Actividades con solicitud de sello pendiente (021). El admin las lee por la
  // política actividad_negocio_select_admin; el nombre del negocio, por la FK.
  const cargarSolicitudesSello = useCallback(async () => {
    setCargandoSellos(true);
    const { data, error } = await supabase
      .from('actividad_negocio')
      .select('id, nombre, descripcion, fecha_inicio, fecha_fin, justificacion_sello, fecha_creacion, negocio:negocio_id (nombre_negocio)')
      .eq('estado_sello', 'pendiente')
      .order('fecha_creacion');

    setCargandoSellos(false);
    if (error) {
      console.error('Error cargando solicitudes de sello:', error);
      setSolicitudesSello([]);
      return;
    }
    setSolicitudesSello((data || []).map(mapearSolicitudSello));
  }, []);

  useEffect(() => {
    cargarPendientes();
    cargarSolicitudesSello();
  }, [cargarPendientes, cargarSolicitudesSello]);

  const aprobar = useCallback(async (negocioId) => {
    const { data, error } = await supabase.rpc('admin_aprobar_negocio', { p_negocio_id: negocioId });
    if (error) {
      console.error('Error aprobando negocio:', error);
      return { exito: false, mensaje: 'No se pudo aprobar. Intenta de nuevo.' };
    }
    if (data.exito) {
      setPendientes((prev) => prev.filter((n) => n.id !== negocioId));
    }
    return data;
  }, []);

  const rechazar = useCallback(async (negocioId, motivo) => {
    const { data, error } = await supabase.rpc('admin_rechazar_negocio', {
      p_negocio_id: negocioId,
      p_motivo: motivo,
    });
    if (error) {
      console.error('Error rechazando negocio:', error);
      return { exito: false, mensaje: 'No se pudo rechazar. Intenta de nuevo.' };
    }
    if (data.exito) {
      setPendientes((prev) => prev.filter((n) => n.id !== negocioId));
    }
    return data;
  }, []);

  const aprobarSello = useCallback(async (actividadId) => {
    const { data, error } = await supabase.rpc('admin_aprobar_sello', { p_actividad_id: actividadId });
    if (error) {
      console.error('Error aprobando sello:', error);
      return { exito: false, mensaje: 'No se pudo aprobar. Intenta de nuevo.' };
    }
    if (data.exito) {
      setSolicitudesSello((prev) => prev.filter((s) => s.id !== actividadId));
    }
    return data;
  }, []);

  const rechazarSello = useCallback(async (actividadId, motivo) => {
    const { data, error } = await supabase.rpc('admin_rechazar_sello', {
      p_actividad_id: actividadId,
      p_motivo: motivo,
    });
    if (error) {
      console.error('Error rechazando sello:', error);
      return { exito: false, mensaje: 'No se pudo rechazar. Intenta de nuevo.' };
    }
    if (data.exito) {
      setSolicitudesSello((prev) => prev.filter((s) => s.id !== actividadId));
    }
    return data;
  }, []);

  return {
    pendientes,
    cargando,
    aprobar,
    rechazar,
    solicitudesSello,
    cargandoSellos,
    aprobarSello,
    rechazarSello,
  };
}
