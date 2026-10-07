import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

const RESUMEN_VACIO = { promedio: null, total: 0, uno: 0, dos: 0, tres: 0, cuatro: 0, cinco: 0 };

// Misma forma que useResenas (negocios) para poder reusar ListaResenas.
function mapearResena(f) {
  return {
    id: f.id,
    autor: f.autor,
    calificacion: f.estrellas,
    comentario: f.texto,
    fecha: f.fecha,
    respuesta: null,
    fechaRespuesta: null,
    esMia: !!f.es_mia,
  };
}

// Reseñas de un sitio turístico (037): cualquiera con sesión puede escribir una, sin sello.
export function useResenasSitio(sitioId) {
  const [resumen, setResumen] = useState(null);
  const [resenas, setResenas] = useState([]);
  const [haySesion, setHaySesion] = useState(false);
  const [idCargado, setIdCargado] = useState(null);
  const [error, setError] = useState('');
  const ultimaCarga = useRef(0);

  const cargar = useCallback(async () => {
    if (sitioId == null) return;
    const miCarga = ++ultimaCarga.current;
    const [{ data: res, error: e1 }, { data: lista, error: e2 }, { data: sesion }] = await Promise.all([
      supabase.rpc('resumen_resenas_sitio', { p_sitio_id: sitioId }),
      supabase.rpc('resenas_sitio_publicas', { p_sitio_id: sitioId }),
      supabase.auth.getSession(),
    ]);
    if (miCarga !== ultimaCarga.current) return;
    setHaySesion(!!sesion?.session);
    if (e1 || e2) {
      console.error('Error cargando reseñas del sitio:', e1 || e2);
      setError('No se pudieron cargar las reseñas.');
      setIdCargado(sitioId);
      return;
    }
    setError('');
    const fila = Array.isArray(res) ? res[0] : res;
    setResumen({ ...RESUMEN_VACIO, ...(fila || {}), total: Number(fila?.total) || 0 });
    setResenas((lista || []).map(mapearResena));
    setIdCargado(sitioId);
  }, [sitioId]);

  useEffect(() => { cargar(); }, [cargar]);

  const guardar = useCallback(async (estrellas, texto) => {
    const { data, error: e } = await supabase.rpc('guardar_resena_sitio', {
      p_sitio_id: sitioId,
      p_estrellas: estrellas,
      p_texto: texto,
    });
    if (e) {
      console.error('Error guardando reseña del sitio:', e);
      return { exito: false, mensaje: 'No se pudo guardar tu reseña. Intenta de nuevo.' };
    }
    if (data?.exito) await cargar();
    return data;
  }, [sitioId, cargar]);

  const eliminarMia = useCallback(async () => {
    const { data, error: e } = await supabase.rpc('eliminar_mi_resena_sitio', { p_sitio_id: sitioId });
    if (e) {
      console.error('Error eliminando reseña del sitio:', e);
      return { exito: false, mensaje: 'No se pudo eliminar tu reseña. Intenta de nuevo.' };
    }
    if (data?.exito) await cargar();
    return data;
  }, [sitioId, cargar]);

  const vigente = sitioId != null && idCargado === sitioId;
  return {
    resumen: vigente ? resumen : null,
    resenas: vigente ? resenas : [],
    haySesion,
    cargando: sitioId != null && !vigente,
    error: vigente ? error : '',
    guardar,
    eliminarMia,
  };
}
