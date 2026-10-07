import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

// Foto de portada de un sitio para el panel del mapa: la marcada es_portada en sitio_foto (037) y, si no hay,
// sitio.imagen_url. Devuelve null mientras carga o si no hay ninguna (el panel pone entonces su respaldo).
export function usePortadaSitio(sitioId) {
  // Se guarda junto al id: al cambiar de sitio no se muestra la foto del anterior mientras llega la nueva.
  const [cargada, setCargada] = useState({ id: null, url: null });

  useEffect(() => {
    if (sitioId == null) return undefined;
    let activo = true;
    Promise.all([
      supabase.from('sitio_foto').select('url').eq('sitio_id', sitioId).eq('es_portada', true).limit(1),
      supabase.from('sitio').select('imagen_url').eq('id', sitioId).limit(1),
    ]).then(([foto, sitio]) => {
      if (!activo) return;
      if (foto.error) console.error('Error cargando la portada del sitio:', foto.error);
      if (sitio.error) console.error('Error cargando la imagen del sitio:', sitio.error);
      const url = foto.data?.[0]?.url || sitio.data?.[0]?.imagen_url || null;
      setCargada({ id: sitioId, url });
    });
    return () => { activo = false; };
  }, [sitioId]);

  return sitioId != null && cargada.id === sitioId ? cargada.url : null;
}
