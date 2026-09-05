import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';

export function useGuardados(usuarioId) {
  const [guardados, setGuardados] = useState([]);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    if (!usuarioId) {
      setGuardados([]);
      return;
    }

    let activo = true;
    setCargando(true);

    supabase
      .from('guardado')
      .select('*')
      .eq('usuario_id', usuarioId)
      .then(({ data, error }) => {
        if (!activo) return;
        if (error) {
          console.error('Error cargando guardados:', error);
          setGuardados([]);
        } else {
          setGuardados(data ?? []);
        }
        setCargando(false);
      });

    return () => { activo = false; };
  }, [usuarioId]);

  const estaGuardado = useCallback(
    (tipo, referenciaId) =>
      guardados.some((g) => g.tipo === tipo && g.referencia_id === String(referenciaId)),
    [guardados]
  );

  const toggleGuardar = useCallback(
    async (tipo, referenciaId, datos = null) => {
      if (!usuarioId) return { exito: false, mensaje: 'Necesitas iniciar sesion.' };

      const refId = String(referenciaId);
      const yaGuardado = guardados.some((g) => g.tipo === tipo && g.referencia_id === refId);

      if (yaGuardado) {
        const { error } = await supabase
          .from('guardado')
          .delete()
          .eq('usuario_id', usuarioId)
          .eq('tipo', tipo)
          .eq('referencia_id', refId);

        if (error) {
          console.error('Error quitando guardado:', error);
          return { exito: false, mensaje: 'No se pudo quitar. Intenta de nuevo.' };
        }
        setGuardados((prev) => prev.filter((g) => !(g.tipo === tipo && g.referencia_id === refId)));
        return { exito: true, guardado: false };
      }

      const nuevo = { usuario_id: usuarioId, tipo, referencia_id: refId, datos };
      const { data, error } = await supabase
        .from('guardado')
        .insert(nuevo)
        .select()
        .single();

      if (error) {
        console.error('Error guardando:', error);
        return { exito: false, mensaje: 'No se pudo guardar. Intenta de nuevo.' };
      }
      setGuardados((prev) => [...prev, data]);
      return { exito: true, guardado: true };
    },
    [usuarioId, guardados]
  );

  const guardadosPorTipo = useCallback(
    (tipo) => guardados.filter((g) => g.tipo === tipo),
    [guardados]
  );

  return { guardados, cargando, estaGuardado, toggleGuardar, guardadosPorTipo };
}
