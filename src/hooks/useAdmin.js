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

export function useAdmin() {
  const [pendientes, setPendientes] = useState([]);
  const [cargando, setCargando] = useState(true);

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

  useEffect(() => {
    cargarPendientes();
  }, [cargarPendientes]);

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

  return { pendientes, cargando, aprobar, rechazar };
}
