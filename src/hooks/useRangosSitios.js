import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

// { [sitioId]: 'cobre' | 'plata' | 'oro' } de la base (sitio.rango, 038). Se pide una sola vez y se comparte entre pantallas.
// Los sitios que no estén en el mapa se tratan como cobre (rangoDeSello).
let cache = null;
let pendiente = null;

function cargarRangos() {
  if (cache) return Promise.resolve(cache);
  if (!pendiente) {
    pendiente = supabase.from('sitio').select('id, rango').then(({ data, error }) => {
      pendiente = null;
      if (error) {
        console.error('Error cargando los rangos de los sitios:', error);
        return {};
      }
      cache = Object.fromEntries((data || []).map((s) => [s.id, s.rango]));
      return cache;
    });
  }
  return pendiente;
}

export function useRangosSitios() {
  const [rangos, setRangos] = useState(cache || {});
  useEffect(() => {
    let activo = true;
    cargarRangos().then((r) => { if (activo) setRangos(r); });
    return () => { activo = false; };
  }, []);
  return rangos;
}
