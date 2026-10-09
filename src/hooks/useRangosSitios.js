import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

// Datos de los sitios que viven en la base (sitio.rango, 038, y sitio.ciudad, 039): { [sitioId]: { rango, ciudad } }.
// Se piden una sola vez y se comparten entre pantallas. Los sitios que no estén en la base se tratan como cobre y de León.
let cache = null;
let pendiente = null;

function cargarSitiosBD() {
  if (cache) return Promise.resolve(cache);
  if (!pendiente) {
    pendiente = supabase.from('sitio').select('id, rango, ciudad').then(({ data, error }) => {
      pendiente = null;
      if (error) {
        console.error('Error cargando los datos de los sitios:', error);
        return {};
      }
      cache = Object.fromEntries((data || []).map((s) => [s.id, { rango: s.rango, ciudad: s.ciudad }]));
      return cache;
    });
  }
  return pendiente;
}

function useSitiosBD() {
  const [datos, setDatos] = useState(cache || {});
  useEffect(() => {
    let activo = true;
    cargarSitiosBD().then((d) => { if (activo) setDatos(d); });
    return () => { activo = false; };
  }, []);
  return datos;
}

// { [sitioId]: 'cobre' | 'plata' | 'oro' }
export function useRangosSitios() {
  const datos = useSitiosBD();
  return Object.fromEntries(Object.entries(datos).map(([id, s]) => [id, s.rango]));
}

// { [sitioId]: 'León' | ... }
export function useCiudadesSitios() {
  const datos = useSitiosBD();
  return Object.fromEntries(Object.entries(datos).map(([id, s]) => [id, s.ciudad]));
}
