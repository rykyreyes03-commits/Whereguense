import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

const SIN_NIVEL = { nivel: 1, puntosActuales: 0, puntosParaSiguiente: 2, porcentaje: 0, puntosTotales: 0 };

// Nivel del usuario por los puntos de sus sellos (calcular_nivel, 038): cobre 1, plata 0.5, oro 2; de N a N+1 hacen falta N*2.
// Se vuelve a pedir cada vez que cambian los sellos. `listo` es falso hasta la primera respuesta (y sin sesión), para que la app
// no confunda "todavía no cargó" con una subida de nivel.
export function useNivel(usuarioId, sellos) {
  const [cargado, setCargado] = useState({ usuarioId: null, info: null });
  const firma = sellos.map((s) => s.id).join(',');

  useEffect(() => {
    if (!usuarioId) return undefined;
    let activo = true;
    supabase.rpc('calcular_nivel', { p_usuario_id: usuarioId }).then(({ data, error }) => {
      if (!activo) return;
      if (error) {
        console.error('Error calculando el nivel:', error);
        return;
      }
      const f = Array.isArray(data) ? data[0] : data;
      if (!f) return;
      setCargado({
        usuarioId,
        info: {
          nivel: Number(f.nivel_actual),
          puntosActuales: Number(f.puntos_actuales),
          puntosParaSiguiente: Number(f.puntos_para_siguiente),
          porcentaje: Number(f.porcentaje),
          puntosTotales: Number(f.puntos_totales),
        },
      });
    });
    return () => { activo = false; };
  }, [usuarioId, firma]);

  const vigente = usuarioId && cargado.usuarioId === usuarioId ? cargado.info : null;
  return { ...(vigente || SIN_NIVEL), listo: Boolean(vigente) };
}
