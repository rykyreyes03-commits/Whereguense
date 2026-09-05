import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export function useNegociosActivos() {
  const [negocios, setNegocios] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let activo = true;

    supabase
      .from('negocio')
      .select('id, nombre_negocio, categoria, descripcion, telefono, latitud, longitud')
      .eq('estado', 'activo')
      .then(({ data, error }) => {
        if (!activo) return;
        if (error) {
          console.error('Error cargando negocios activos:', error);
          setNegocios([]);
        } else {
          setNegocios(
            (data || []).map((n) => ({
              id: n.id,
              name: n.nombre_negocio,
              categoria: n.categoria,
              descripcion: n.descripcion,
              telefono: n.telefono,
              position: [n.latitud, n.longitud],
            }))
          );
        }
        setCargando(false);
      });

    return () => { activo = false; };
  }, []);

  return { negocios, cargando };
}
