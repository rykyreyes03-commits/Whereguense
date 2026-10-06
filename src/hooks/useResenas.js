import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

const RESUMEN_VACIO = { promedio: null, total: 0, uno: 0, dos: 0, tres: 0, cuatro: 0, cinco: 0 };

function mapearResena(f) {
  return {
    id: f.id,
    autor: f.autor,
    calificacion: f.calificacion,
    comentario: f.comentario,
    fecha: f.fecha,
    respuesta: f.respuesta,
    fechaRespuesta: f.fecha_respuesta,
    esMia: !!f.es_mia,
  };
}

// Solo el resumen (promedio y total) de un negocio: para la línea "★ 4.6 · 12 reseñas".
export function useResumenResenas(negocioId) {
  // Se guarda junto al id: si el negocio cambia, el resumen del anterior no se muestra mientras llega el nuevo.
  const [cargado, setCargado] = useState({ id: null, resumen: null });
  useEffect(() => {
    if (negocioId == null) return undefined;
    let activo = true;
    supabase.rpc('resumen_resenas', { p_negocio_id: negocioId }).then(({ data, error }) => {
      if (!activo) return;
      if (error) { console.error('Error cargando resumen de reseñas:', error); setCargado({ id: negocioId, resumen: null }); return; }
      const fila = Array.isArray(data) ? data[0] : data;
      setCargado({ id: negocioId, resumen: fila ? { ...RESUMEN_VACIO, ...fila, total: Number(fila.total) || 0 } : RESUMEN_VACIO });
    });
    return () => { activo = false; };
  }, [negocioId]);
  return negocioId != null && cargado.id === negocioId ? cargado.resumen : null;
}

// Reseñas de un negocio: resumen, lista (más recientes primero), si quien mira puede escribir una y las acciones.
// Todo pasa por funciones de la base (032): la tabla no se lee ni se escribe directo.
export function useResenas(negocioId) {
  const [resumen, setResumen] = useState(null);
  const [resenas, setResenas] = useState([]);
  const [puedeResenar, setPuedeResenar] = useState(false);
  const [haySesion, setHaySesion] = useState(false);
  // Negocio al que corresponde lo cargado: si el negocio cambia, lo del anterior no se muestra mientras llega lo nuevo.
  const [idCargado, setIdCargado] = useState(null);
  const [error, setError] = useState('');

  // Número de la última carga pedida: una respuesta vieja (otro negocio, o una carga anterior) no pisa a la nueva.
  const ultimaCarga = useRef(0);

  const cargar = useCallback(async () => {
    if (negocioId == null) return;
    const miCarga = ++ultimaCarga.current;
    const [{ data: res, error: e1 }, { data: lista, error: e2 }, { data: sesion }] = await Promise.all([
      supabase.rpc('resumen_resenas', { p_negocio_id: negocioId }),
      supabase.rpc('resenas_publicas', { p_negocio_id: negocioId }),
      supabase.auth.getSession(),
    ]);
    if (miCarga !== ultimaCarga.current) return;
    const conSesion = !!sesion?.session;
    setHaySesion(conSesion);
    if (e1 || e2) {
      console.error('Error cargando reseñas:', e1 || e2);
      setError('No se pudieron cargar las reseñas.');
      setIdCargado(negocioId);
      return;
    }
    setError('');
    const fila = Array.isArray(res) ? res[0] : res;
    setResumen({ ...RESUMEN_VACIO, ...(fila || {}), total: Number(fila?.total) || 0 });
    setResenas((lista || []).map(mapearResena));
    if (conSesion) {
      const { data: puede, error: e3 } = await supabase.rpc('puede_resenar', { p_negocio_id: negocioId });
      if (e3) console.error('Error comprobando si puede reseñar:', e3);
      if (miCarga !== ultimaCarga.current) return;
      setPuedeResenar(!e3 && puede === true);
    } else {
      setPuedeResenar(false);
    }
    setIdCargado(negocioId);
  }, [negocioId]);

  useEffect(() => { cargar(); }, [cargar]);

  const guardar = useCallback(async (calificacion, comentario) => {
    const { data, error: e } = await supabase.rpc('guardar_resena', {
      p_negocio_id: negocioId,
      p_calificacion: calificacion,
      p_comentario: comentario,
    });
    if (e) {
      console.error('Error guardando reseña:', e);
      return { exito: false, mensaje: 'No se pudo guardar tu reseña. Intenta de nuevo.' };
    }
    if (data?.exito) await cargar();
    return data;
  }, [negocioId, cargar]);

  const responder = useCallback(async (resenaId, respuesta) => {
    const { data, error: e } = await supabase.rpc('responder_resena', { p_resena_id: resenaId, p_respuesta: respuesta });
    if (e) {
      console.error('Error respondiendo reseña:', e);
      return { exito: false, mensaje: 'No se pudo guardar tu respuesta. Intenta de nuevo.' };
    }
    if (data?.exito) await cargar();
    return data;
  }, [cargar]);

  const vigente = negocioId != null && idCargado === negocioId;
  return {
    resumen: vigente ? resumen : null,
    resenas: vigente ? resenas : [],
    puedeResenar: vigente && puedeResenar,
    haySesion,
    cargando: negocioId != null && !vigente,
    error: vigente ? error : '',
    recargar: cargar,
    guardar,
    responder,
  };
}
