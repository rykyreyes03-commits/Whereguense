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

  const sellar = useCallback(async (sitio) => {
    if (!usuarioId) {
      return { exito: false, mensaje: 'Necesitas iniciar sesión.' };
    }
    if (sellos.some((s) => s.sitioId === sitio.id)) {
      return { exito: false, mensaje: `Ya tienes el sello de ${sitio.name}` };
    }

    const { data, error } = await supabase
      .from('sello')
      .insert({
        usuario_id: usuarioId,
        sitio_id: sitio.id,
        tipo: 'geolocalizacion',
      })
      .select('id, sitio_id, qr_sello_id, tipo, fecha_sello, qr_sello(nombre_actividad)')
      .single();

    if (error) {
      if (error.code === '23505') {
        return { exito: false, mensaje: `Ya tienes el sello de ${sitio.name}` };
      }
      console.error('Error guardando sello:', error);
      return { exito: false, mensaje: 'No se pudo guardar el sello. Intenta de nuevo.' };
    }

    const nuevoSello = mapearSello(data);
    setSellos((prev) => [...prev, nuevoSello]);
    return { exito: true, mensaje: `¡Sello obtenido en ${sitio.name}!` };
  }, [usuarioId, sellos]);

  return { sellos, sellar };
}
