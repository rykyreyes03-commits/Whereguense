import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

// Cupones de un negocio (lado del dueño, 027). El token de cada cupón y el de canje no se
// leen de las tablas: llegan por mis_cupones_negocio.
export function useCuponesNegocio(negocioId) {
  const [cupones, setCupones] = useState([]);
  const [tokenCanje, setTokenCanje] = useState(null);
  const [otorgados, setOtorgados] = useState(null); // null = aún no se pidió
  const [cargando, setCargando] = useState(true);

  const pedir = useCallback(async () => {
    if (!negocioId) return { cupones: [], tokenCanje: null };
    const { data, error } = await supabase.rpc('mis_cupones_negocio', { p_negocio_id: negocioId });
    if (error || !data?.exito) {
      console.error('Error cargando cupones del negocio:', error || data?.mensaje);
      return { cupones: [], tokenCanje: null };
    }
    return { cupones: data.cupones || [], tokenCanje: data.token_canje || null };
  }, [negocioId]);

  useEffect(() => {
    let activo = true;
    pedir().then((res) => {
      if (!activo) return;
      setCupones(res.cupones);
      setTokenCanje(res.tokenCanje);
      setCargando(false);
    });
    return () => { activo = false; };
  }, [pedir]);

  const cargar = useCallback(async () => {
    const res = await pedir();
    setCupones(res.cupones);
    setTokenCanje(res.tokenCanje);
  }, [pedir]);

  // Quién tiene cada cupón (mis_cupones_otorgados). Se trae completo y se agrupa en la pantalla.
  const cargarOtorgados = useCallback(async () => {
    if (!negocioId) return;
    const { data, error } = await supabase.rpc('mis_cupones_otorgados', { p_negocio_id: negocioId });
    if (error || !data?.exito) {
      console.error('Error cargando cupones otorgados:', error || data?.mensaje);
      setOtorgados([]);
    } else {
      setOtorgados(data.cupones || []);
    }
  }, [negocioId]);

  // fechaExpiracion llega como 'YYYY-MM-DD': se guarda el fin de ese día (hora local), porque en
  // la base el cupón vence cuando fecha_expiracion < now().
  const crearCupon = useCallback(async ({ descripcion, descuento, fechaExpiracion, limiteTotal }) => {
    if (!negocioId) return { exito: false, mensaje: 'No hay negocio para actualizar.' };

    const { error } = await supabase
      .from('cupon')
      .insert({
        negocio_id: negocioId,
        descripcion,
        descuento_porcentaje: descuento,
        fecha_expiracion: fechaExpiracion ? new Date(`${fechaExpiracion}T23:59:59`).toISOString() : null,
        limite_total: limiteTotal || null,
      });

    if (error) {
      console.error('Error creando cupón:', error);
      return { exito: false, mensaje: 'No se pudo crear el cupón. Intenta de nuevo.' };
    }

    await cargar(); // trae el token (que el insert no devuelve) y el token de canje
    return { exito: true };
  }, [negocioId, cargar]);

  const cambiarActivo = useCallback(async (cuponId, activo) => {
    const { error } = await supabase.from('cupon').update({ activo }).eq('id', cuponId);
    if (error) {
      console.error('Error cambiando el estado del cupón:', error);
      return { exito: false, mensaje: 'No se pudo actualizar el cupón. Intenta de nuevo.' };
    }
    setCupones((prev) => prev.map((c) => (c.id === cuponId ? { ...c, activo } : c)));
    return { exito: true };
  }, []);

  return { cupones, tokenCanje, otorgados, cargando, cargarOtorgados, crearCupon, cambiarActivo };
}
