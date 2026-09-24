import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { sitios } from '../data/sitios';

const sitiosPorId = Object.fromEntries(sitios.map((s) => [s.id, s]));

function mapearSello(row) {
  const sitio = row.sitio_id != null ? sitiosPorId[row.sitio_id] : null;
  return {
    id: row.id,
    sitioId: row.sitio_id,
    nombre: sitio?.name || row.qr_sello?.nombre_actividad || 'Actividad',
    fecha: new Date(row.fecha_sello).toLocaleDateString('es-NI'),
  };
}

export function useSellos(usuarioId) {
  const [sellos, setSellos] = useState([]);

  useEffect(() => {
    if (!usuarioId) {
      setSellos([]);
      return undefined;
    }
    let activo = true;
    supabase
      .from('sello')
      .select('id, sitio_id, qr_sello_id, tipo, fecha_sello, qr_sello(nombre_actividad)')
      .eq('usuario_id', usuarioId)
      .order('fecha_sello')
      .then(({ data, error }) => {
        if (!activo) return;
        if (error) {
          console.error('Error cargando sellos:', error);
          setSellos([]);
        } else {
          setSellos((data || []).map(mapearSello));
        }
      });
    return () => { activo = false; };
  }, [usuarioId]);

  const sellar = useCallback(async (sitio, ubicacionUsuario) => {
    if (!usuarioId) return { exito: false, mensaje: 'Necesitas iniciar sesión.' };
    if (!ubicacionUsuario) return { exito: false, mensaje: 'No se pudo obtener tu ubicación.' };
    if (sellos.some((s) => s.sitioId === sitio.id)) {
      return { exito: false, mensaje: `Ya tienes el sello de ${sitio.name}` };
    }

    const { data, error } = await supabase.rpc('sellar_por_geolocalizacion', {
      p_sitio_id: sitio.id,
      p_lat: ubicacionUsuario.lat,
      p_lng: ubicacionUsuario.lng,
    });

    if (error) {
      console.error('Error guardando sello:', error);
      return { exito: false, mensaje: 'No se pudo guardar el sello. Intenta de nuevo.' };
    }

    if (!data.exito) {
      return { exito: false, mensaje: data.mensaje };
    }

    const { data: filaSello, error: errorFila } = await supabase
      .from('sello')
      .select('id, sitio_id, qr_sello_id, tipo, fecha_sello, qr_sello(nombre_actividad)')
      .eq('id', data.sello_id)
      .single();

    if (!errorFila && filaSello) {
      setSellos((prev) => [...prev, mapearSello(filaSello)]);
    }

    return { exito: true, mensaje: data.mensaje };
  }, [usuarioId, sellos]);

  const canjearQR = useCallback(async (token) => {
    if (!usuarioId) {
      return { exito: false, mensaje: 'Necesitas iniciar sesión.' };
    }

    const { data, error } = await supabase.rpc('canjear_qr_sello', { p_token: token });

    if (error) {
      console.error('Error canjeando QR:', error);
      return { exito: false, mensaje: 'No se pudo procesar el código. Intenta de nuevo.' };
    }

    if (!data.exito) {
      return { exito: false, mensaje: data.mensaje };
    }

    const { data: filaSello, error: errorFila } = await supabase
      .from('sello')
      .select('id, sitio_id, qr_sello_id, tipo, fecha_sello, qr_sello(nombre_actividad)')
      .eq('id', data.sello_id)
      .single();

    if (!errorFila && filaSello) {
      setSellos((prev) => [...prev, mapearSello(filaSello)]);
    }

    return { exito: true, mensaje: data.mensaje };
  }, [usuarioId]);

  return { sellos, sellar, canjearQR };
}
