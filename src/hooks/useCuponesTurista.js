import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

const ERROR_GENERICO = 'No se pudo procesar el código. Intenta de nuevo.';

// Cupones del turista (027). Todo pasa por funciones de la base: el turista no puede leer
// la tabla cupon ni escribir en cupon_obtenido.
export function useCuponesTurista(usuarioId) {
  const [cupones, setCupones] = useState([]);
  const [cargando, setCargando] = useState(true);

  // mis_cupones_obtenidos: obtenidos y usados, con negocio y datos del cupón ya unidos.
  const pedir = useCallback(async () => {
    if (!usuarioId) return [];
    const { data, error } = await supabase.rpc('mis_cupones_obtenidos');
    if (error || !data?.exito) {
      console.error('Error cargando mis cupones:', error || data?.mensaje);
      return [];
    }
    return data.cupones || [];
  }, [usuarioId]);

  useEffect(() => {
    let activo = true;
    pedir().then((lista) => {
      if (!activo) return;
      setCupones(lista);
      setCargando(false);
    });
    return () => { activo = false; };
  }, [pedir]);

  const cargar = useCallback(async () => {
    setCupones(await pedir());
  }, [pedir]);

  const obtenerCupon = useCallback(async (token) => {
    const { data, error } = await supabase.rpc('obtener_cupon', { p_token: token });
    if (error) {
      console.error('Error obteniendo cupón:', error);
      return { exito: false, mensaje: ERROR_GENERICO };
    }
    if (data.exito) await cargar();
    return data;
  }, [cargar]);

  const iniciarCanje = useCallback(async (tokenNegocio) => {
    const { data, error } = await supabase.rpc('iniciar_canje_cupon', { p_token_negocio: tokenNegocio });
    if (error) {
      console.error('Error iniciando el canje:', error);
      return { exito: false, mensaje: ERROR_GENERICO };
    }
    // Lista al día antes de mostrarle al turista sus cupones de ese negocio.
    if (data.exito) await cargar();
    return data;
  }, [cargar]);

  const usarCupon = useCallback(async (cuponObtenidoId, tokenNegocio) => {
    const { data, error } = await supabase.rpc('usar_cupon', {
      p_cupon_obtenido_id: cuponObtenidoId,
      p_token_negocio: tokenNegocio,
    });
    if (error) {
      console.error('Error usando el cupón:', error);
      return { exito: false, mensaje: ERROR_GENERICO };
    }
    await cargar();
    return data;
  }, [cargar]);

  return { cupones, cargando, recargar: cargar, obtenerCupon, iniciarCanje, usarCupon };
}
