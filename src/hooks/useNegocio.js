import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

function mapearNegocio(fila) {
  if (!fila) return null;
  return {
    id: fila.id,
    nombre: fila.nombre_negocio,
    categoria: fila.categoria,
    estado: fila.estado,
    motivoRechazo: fila.motivo_rechazo,
    fechaEnvio: fila.fecha_envio,
    ubicacion: { lat: fila.latitud, lng: fila.longitud },
  };
}

export function useNegocio(usuarioId) {
  const [negocio, setNegocio] = useState(null);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    if (!usuarioId) {
      setNegocio(null);
      return undefined;
    }

    let activo = true;
    setCargando(true);

    supabase
      .from('negocio')
      .select('*')
      .eq('usuario_id', usuarioId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!activo) return;
        if (error) {
          console.error('Error cargando negocio:', error);
          setNegocio(null);
        } else {
          setNegocio(mapearNegocio(data));
        }
        setCargando(false);
      });

    return () => { activo = false; };
  }, [usuarioId]);

  const registrar = useCallback(async (datos) => {
    if (!usuarioId) {
      return { exito: false, mensaje: 'Necesitas iniciar sesión.' };
    }

    const { data, error } = await supabase
      .from('negocio')
      .insert({
        usuario_id: usuarioId,
        nombre_negocio: datos.nombre,
        categoria: datos.categoria,
        latitud: datos.ubicacion.lat,
        longitud: datos.ubicacion.lng,
      })
      .select()
      .single();

    if (error) {
      console.error('Error registrando negocio:', error);
      return { exito: false, mensaje: 'No se pudo enviar el registro. Intenta de nuevo.' };
    }

    setNegocio(mapearNegocio(data));
    return { exito: true };
  }, [usuarioId]);

  const simularAprobar = useCallback(async () => {
    if (!negocio) return { exito: false, mensaje: 'No hay negocio para aprobar.' };

    const { data, error } = await supabase
      .from('negocio')
      .update({ estado: 'activo', motivo_rechazo: null, fecha_aprobacion: new Date().toISOString() })
      .eq('id', negocio.id)
      .select()
      .single();

    if (error) {
      console.error('Error aprobando negocio:', error);
      return { exito: false, mensaje: 'No se pudo actualizar. Intenta de nuevo.' };
    }

    setNegocio(mapearNegocio(data));
    return { exito: true };
  }, [negocio]);

  const simularRechazar = useCallback(async (motivo) => {
    if (!negocio) return { exito: false, mensaje: 'No hay negocio para rechazar.' };

    const { data, error } = await supabase
      .from('negocio')
      .update({ estado: 'rechazado', motivo_rechazo: motivo || 'No especificado' })
      .eq('id', negocio.id)
      .select()
      .single();

    if (error) {
      console.error('Error rechazando negocio:', error);
      return { exito: false, mensaje: 'No se pudo actualizar. Intenta de nuevo.' };
    }

    setNegocio(mapearNegocio(data));
    return { exito: true };
  }, [negocio]);

  const actualizarUbicacion = useCallback(async (ubicacion) => {
    if (!negocio) return { exito: false, mensaje: 'No hay negocio para actualizar.' };

    const { data, error } = await supabase
      .from('negocio')
      .update({ latitud: ubicacion.lat, longitud: ubicacion.lng })
      .eq('id', negocio.id)
      .select()
      .single();

    if (error) {
      console.error('Error actualizando ubicación del negocio:', error);
      return { exito: false, mensaje: 'No se pudo actualizar. Intenta de nuevo.' };
    }

    setNegocio(mapearNegocio(data));
    return { exito: true };
  }, [negocio]);

  // Pendientes de migrar en pasos siguientes (horarios, fotos, productos, QR):
  const actualizarHorarios = useCallback(() => {
    console.warn('actualizarHorarios: pendiente de migrar a Supabase.');
  }, []);
  const agregarProducto = useCallback(() => {
    console.warn('agregarProducto: pendiente de migrar a Supabase.');
  }, []);
  const eliminarProducto = useCallback(() => {
    console.warn('eliminarProducto: pendiente de migrar a Supabase.');
  }, []);
  const generarQR = useCallback(() => {
    console.warn('generarQR: pendiente de migrar a Supabase.');
  }, []);

  return {
    negocio,
    cargando,
    registrar,
    simularAprobar,
    simularRechazar,
    actualizarHorarios,
    actualizarUbicacion,
    agregarProducto,
    eliminarProducto,
    generarQR,
  };
}
