import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { hoyISO } from '../utils/eventos';

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
      return null; // fallo: se conserva lo que ya había (si no, un fallo de red vaciaría la lista tras guardar bien)
    }
    return { cupones: data.cupones || [], tokenCanje: data.token_canje || null };
  }, [negocioId]);

  useEffect(() => {
    let activo = true;
    pedir().then((res) => {
      if (!activo) return;
      if (res) {
        setCupones(res.cupones);
        setTokenCanje(res.tokenCanje);
      }
      setCargando(false);
    });
    return () => { activo = false; };
  }, [pedir]);

  const cargar = useCallback(async () => {
    const res = await pedir();
    if (!res) return;
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

  // Edita un cupón. Reglas (las aplica la base con un trigger; aquí se mandan solo los campos que se pueden cambiar):
  // el porcentaje no cambia si alguien ya lo obtuvo, el límite no baja de lo obtenido y el vencimiento solo se amplía.
  // fechaExpiracion: 'YYYY-MM-DD' (fin de ese día, hora local) o '' para quitar el vencimiento.
  const editarCupon = useCallback(async (cupon, { descripcion, descuento, fechaExpiracion, limiteTotal }) => {
    const cambios = {
      descripcion,
      limite_total: limiteTotal || null,
      ...(cupon.obtenidos > 0 ? {} : { descuento_porcentaje: descuento }),
    };
    const diaActual = cupon.fecha_expiracion ? hoyISO(new Date(cupon.fecha_expiracion)) : '';
    if (fechaExpiracion !== diaActual) {
      cambios.fecha_expiracion = fechaExpiracion ? new Date(`${fechaExpiracion}T23:59:59`).toISOString() : null;
    }

    const { error } = await supabase.from('cupon').update(cambios).eq('id', cupon.id);
    if (error) {
      console.error('Error editando el cupón:', error);
      // Los mensajes de la base ('Ya lo obtuvieron…', 'El límite no puede ser menor…', 'El vencimiento solo se puede ampliar…') son claros.
      const mensajeBase = ['23514', '42501'].includes(error.code)
        && /^(Ya lo obtuv|El límite no puede|El vencimiento solo|La nueva fecha)/.test(error.message || '');
      if (mensajeBase) await cargar(); // la regla que saltó suele depender de datos que cambiaron (p. ej. cuántos lo obtuvieron)
      return { exito: false, mensaje: mensajeBase ? error.message : 'No se pudieron guardar los cambios. Intenta de nuevo.' };
    }
    await cargar();
    return { exito: true };
  }, [cargar]);

  // Elimina un cupón que nadie ha obtenido (eliminar_cupon); si alguien ya lo tiene, la base lo rechaza con el motivo.
  const borrarCupon = useCallback(async (cuponId) => {
    const { data, error } = await supabase.rpc('eliminar_cupon', { p_id: cuponId });
    if (error || !data) {
      console.error('Error eliminando el cupón:', error);
      return { exito: false, mensaje: 'No se pudo eliminar el cupón. Intenta de nuevo.' };
    }
    if (!data.exito) {
      await cargar(); // ya lo obtuvieron: se actualiza el conteo que ve el dueño
      return { exito: false, mensaje: data.mensaje };
    }
    await cargar();
    return { exito: true };
  }, [cargar]);

  return { cupones, tokenCanje, otorgados, cargando, cargar, cargarOtorgados, crearCupon, cambiarActivo, editarCupon, borrarCupon };
}
