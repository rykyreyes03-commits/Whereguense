import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

// Fotos de un sitio (tabla sitio_foto, 037), por orden. La portada es la marcada es_portada (o la primera).
export function useSitioGaleria(sitioId) {
  // Se guarda junto al id: si el sitio cambia, las fotos del anterior no se muestran mientras llegan las nuevas.
  const [cargado, setCargado] = useState({ id: null, fotos: [] });

  useEffect(() => {
    if (sitioId == null) return undefined;
    let activo = true;
    supabase
      .from('sitio_foto')
      .select('id, url, orden, es_portada')
      .eq('sitio_id', sitioId)
      .order('orden', { ascending: true })
      .then(({ data, error }) => {
        if (!activo) return;
        if (error) console.error('Error cargando la galería del sitio:', error);
        setCargado({ id: sitioId, fotos: error ? [] : data || [] });
      });
    return () => { activo = false; };
  }, [sitioId]);

  const fotos = sitioId != null && cargado.id === sitioId ? cargado.fotos : [];
  const portada = fotos.find((f) => f.es_portada) || fotos[0] || null;
  return { fotos, portadaUrl: portada ? portada.url : null };
}
