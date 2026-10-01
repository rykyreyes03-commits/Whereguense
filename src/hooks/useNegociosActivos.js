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
      // Mismo criterio que la RLS (migración 016). Además cubre al dueño de un negocio
      // vencido: la RLS se lo deja ver, pero en el mapa debe verse igual que para todos.
      .gt('fecha_vencimiento_suscripcion', new Date().toISOString())
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
