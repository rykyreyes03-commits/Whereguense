import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

function mapearNegocio(fila) {
  if (!fila) return null;
  return {
    id: fila.id,
    nombre: fila.nombre_negocio,
    categoria: fila.categoria,
    descripcion: fila.descripcion,
    telefono: fila.telefono,
    logoUrl: fila.logo_url,
    estado: fila.estado,
    motivoRechazo: fila.motivo_rechazo,
    fechaEnvio: fila.fecha_envio,
    vencimientoSuscripcion: fila.fecha_vencimiento_suscripcion,
    ubicacion: { lat: fila.latitud, lng: fila.longitud },
  };
}

function horarioPorDefecto() {
  return Array.from({ length: 7 }, (_, diaSemana) => ({
    diaSemana,
    horaApertura: '08:00',
    horaCierre: '18:00',
    cerrado: false,
  }));
}

export function useNegocio(usuarioId) {
  const [negocio, setNegocio] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [horarios, setHorarios] = useState([]);
  const [fotos, setFotos] = useState([]);
  const [productos, setProductos] = useState([]);
  const [actividadesQR, setActividadesQR] = useState([]);

  useEffect(() => {
    if (!usuarioId) {
      setNegocio(null);
      return undefined;
    }

    let activo = true;
    setCargando(true);

    supabase
      .from('negocio')
      .select('*')
      .eq('usuario_id', usuarioId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!activo) return;
        if (error) {
          console.error('Error cargando negocio:', error);
          setNegocio(null);
        } else {
          setNegocio(mapearNegocio(data));
        }
        setCargando(false);
      });

    return () => { activo = false; };
  }, [usuarioId]);

  useEffect(() => {
    if (!negocio?.id) {
      setHorarios([]);
      return undefined;
    }

    let activo = true;

    supabase
      .from('negocio_horario')
      .select('dia_semana, hora_apertura, hora_cierre, cerrado')
      .eq('negocio_id', negocio.id)
      .order('dia_semana')
      .then(({ data, error }) => {
        if (!activo) return;
        if (error) {
          console.error('Error cargando horarios:', error);
          setHorarios(horarioPorDefecto());
          return;
        }
        if (!data || data.length === 0) {
          setHorarios(horarioPorDefecto());
          return;
        }
        setHorarios(
          data.map((f) => ({
            diaSemana: f.dia_semana,
            horaApertura: f.hora_apertura ? f.hora_apertura.slice(0, 5) : null,
            horaCierre: f.hora_cierre ? f.hora_cierre.slice(0, 5) : null,
            cerrado: f.cerrado,
          }))
        );
      });

    return () => { activo = false; };
  }, [negocio?.id]);

  useEffect(() => {
    if (!negocio?.id) {
      setFotos([]);
      return undefined;
    }

    let activo = true;

    supabase
      .from('negocio_foto')
      .select('id, url, tipo, orden')
      .eq('negocio_id', negocio.id)
      .order('orden')
      .then(({ data, error }) => {
        if (!activo) return;
        if (error) {
          console.error('Error cargando fotos:', error);
          setFotos([]);
        } else {
          setFotos(data || []);
        }
      });

    return () => { activo = false; };
  }, [negocio?.id]);

  useEffect(() => {
    if (!negocio?.id) {
      setProductos([]);
      return undefined;
    }
    let activo = true;
    supabase
      .from('producto')
      .select('id, nombre, orden')
      .eq('negocio_id', negocio.id)
      .order('orden')
      .then(({ data, error }) => {
        if (!activo) return;
        if (error) {
          console.error('Error cargando productos:', error);
          setProductos([]);
        } else {
          setProductos(data || []);
        }
      });
    return () => { activo = false; };
  }, [negocio?.id]);

  useEffect(() => {
    if (!negocio?.id) {
      setActividadesQR([]);
      return undefined;
    }
    let activo = true;
    supabase
      .rpc('mis_actividades_qr', { p_negocio_id: negocio.id })
      .then(({ data, error }) => {
        if (!activo) return;
        if (error) {
          console.error('Error cargando actividades QR:', error);
          setActividadesQR([]);
        } else if (!data.exito) {
          console.error('Error cargando actividades QR:', data.mensaje);
          setActividadesQR([]);
        } else {
          setActividadesQR(data.actividades || []);
        }
      });
    return () => { activo = false; };
  }, [negocio?.id]);

  const registrar = useCallback(async (datos) => {
    if (!usuarioId) {
      return { exito: false, mensaje: 'Necesitas iniciar sesión.' };
    }

    const { data, error } = await supabase
      .from('negocio')
      .insert({
        usuario_id: usuarioId,
        nombre_negocio: datos.nombre,
        categoria: datos.categoria,
        responsable: datos.responsable || null,
        cedula_ruc: datos.cedulaRuc || null,
        latitud: datos.ubicacion.lat,
        longitud: datos.ubicacion.lng,
      })
      .select()
      .single();

    if (error) {
      console.error('Error registrando negocio:', error);
      return { exito: false, mensaje: 'No se pudo enviar el registro. Intenta de nuevo.' };
    }

    setNegocio(mapearNegocio(data));
    return { exito: true };
  }, [usuarioId]);

  const actualizarUbicacion = useCallback(async (ubicacion) => {
    if (!negocio) return { exito: false, mensaje: 'No hay negocio para actualizar.' };

    const { data, error } = await supabase
      .from('negocio')
      .update({ latitud: ubicacion.lat, longitud: ubicacion.lng })
      .eq('id', negocio.id)
      .select()
      .single();

    if (error) {
      console.error('Error actualizando ubicación del negocio:', error);
      return { exito: false, mensaje: 'No se pudo actualizar. Intenta de nuevo.' };
    }

    setNegocio(mapearNegocio(data));
    return { exito: true };
  }, [negocio]);

  const actualizarPerfil = useCallback(async ({ nombre, categoria, descripcion, telefono }) => {
    if (!negocio) return { exito: false, mensaje: 'No hay negocio para actualizar.' };

    const { data, error } = await supabase
      .from('negocio')
      .update({
        nombre_negocio: nombre,
        categoria,
        descripcion,
        telefono,
      })
      .eq('id', negocio.id)
      .select()
      .single();

    if (error) {
      console.error('Error actualizando perfil del negocio:', error);
      return { exito: false, mensaje: 'No se pudo actualizar. Intenta de nuevo.' };
    }

    setNegocio(mapearNegocio(data));
    return { exito: true };
  }, [negocio]);

  const subirLogo = useCallback(async (usuarioId, file) => {
    if (!negocio) return { exito: false, mensaje: 'No hay negocio para actualizar.' };

    const extension = file.name.split('.').pop();
    const ruta = `${usuarioId}/logo.${extension}`;

    const { error: errorSubida } = await supabase.storage
      .from('negocios')
      .upload(ruta, file, { upsert: true });

    if (errorSubida) {
      console.error('Error subiendo logo:', errorSubida);
      return { exito: false, mensaje: 'No se pudo subir el logo. Intenta de nuevo.' };
    }

    const { data: urlPublica } = supabase.storage.from('negocios').getPublicUrl(ruta);
    const logoUrlConCache = `${urlPublica.publicUrl}?t=${Date.now()}`;

    const { data, error } = await supabase
      .from('negocio')
      .update({ logo_url: logoUrlConCache })
      .eq('id', negocio.id)
      .select()
      .single();

    if (error) {
      console.error('Error guardando logo_url:', error);
      return { exito: false, mensaje: 'El logo se subió pero no se pudo guardar. Intenta de nuevo.' };
    }

    setNegocio(mapearNegocio(data));
    return { exito: true };
  }, [negocio]);

  const subirFoto = useCallback(async (usuarioId, file) => {
    if (!negocio) return { exito: false, mensaje: 'No hay negocio para actualizar.' };

    const extension = file.name.split('.').pop();
    const ruta = `${usuarioId}/fotos/${Date.now()}.${extension}`;

    const { error: errorSubida } = await supabase.storage
      .from('negocios')
      .upload(ruta, file);

    if (errorSubida) {
      console.error('Error subiendo foto:', errorSubida);
      return { exito: false, mensaje: 'No se pudo subir la foto. Intenta de nuevo.' };
    }

    const { data: urlPublica } = supabase.storage.from('negocios').getPublicUrl(ruta);

    const { data, error } = await supabase
      .from('negocio_foto')
      .insert({
        negocio_id: negocio.id,
        url: urlPublica.publicUrl,
        orden: fotos.length,
      })
      .select()
      .single();

    if (error) {
      console.error('Error guardando foto:', error);
      return { exito: false, mensaje: 'La foto se subió pero no se pudo guardar. Intenta de nuevo.' };
    }

    setFotos((prev) => [...prev, data]);
    return { exito: true };
  }, [negocio, fotos]);

  const eliminarFoto = useCallback(async (fotoId) => {
    const { error } = await supabase
      .from('negocio_foto')
      .delete()
      .eq('id', fotoId);

    if (error) {
      console.error('Error eliminando foto:', error);
      return { exito: false, mensaje: 'No se pudo quitar la foto. Intenta de nuevo.' };
    }

    setFotos((prev) => prev.filter((f) => f.id !== fotoId));
    return { exito: true };
  }, []);

  // Pendientes de migrar en pasos siguientes (horarios, fotos, productos, QR):
  const actualizarHorarios = useCallback(async (nuevosHorarios) => {
    if (!negocio) return { exito: false, mensaje: 'No hay negocio para actualizar.' };

    const filas = nuevosHorarios.map((h) => ({
      negocio_id: negocio.id,
      dia_semana: h.diaSemana,
      hora_apertura: h.cerrado ? null : h.horaApertura,
      hora_cierre: h.cerrado ? null : h.horaCierre,
      cerrado: h.cerrado,
    }));

    const { error } = await supabase
      .from('negocio_horario')
      .upsert(filas, { onConflict: 'negocio_id,dia_semana' });

    if (error) {
      console.error('Error guardando horarios:', error);
      return { exito: false, mensaje: 'No se pudo guardar. Intenta de nuevo.' };
    }

    setHorarios(nuevosHorarios);
    return { exito: true };
  }, [negocio]);
  const agregarProducto = useCallback(async (nombre) => {
    if (!negocio) return { exito: false, mensaje: 'No hay negocio para actualizar.' };

    const { data, error } = await supabase
      .from('producto')
      .insert({
        negocio_id: negocio.id,
        nombre,
        orden: productos.length,
      })
      .select()
      .single();

    if (error) {
      console.error('Error guardando producto:', error);
      return { exito: false, mensaje: 'No se pudo guardar el producto. Intenta de nuevo.' };
    }

    setProductos((prev) => [...prev, data]);
    return { exito: true };
  }, [negocio, productos]);

  const eliminarProducto = useCallback(async (productoId) => {
    const { error } = await supabase
      .from('producto')
      .delete()
      .eq('id', productoId);

    if (error) {
      console.error('Error eliminando producto:', error);
      return { exito: false, mensaje: 'No se pudo quitar el producto. Intenta de nuevo.' };
    }

    setProductos((prev) => prev.filter((p) => p.id !== productoId));
    return { exito: true };
  }, []);
  const crearActividadQR = useCallback(async ({ nombre, color, limiteCanjes, fechaExpiracion }) => {
    if (!negocio) return { exito: false, mensaje: 'No hay negocio para actualizar.' };

    const { data, error } = await supabase.rpc('crear_actividad_qr', {
      p_negocio_id: negocio.id,
      p_nombre_actividad: nombre,
      p_color: color,
      p_limite_canjes: limiteCanjes || null,
      p_fecha_expiracion: fechaExpiracion || null,
    });

    if (error) {
      console.error('Error creando actividad QR:', error);
      return { exito: false, mensaje: 'No se pudo crear la actividad. Intenta de nuevo.' };
    }

    if (!data.exito) {
      return { exito: false, mensaje: data.mensaje };
    }

    setActividadesQR((prev) => [data.actividad, ...prev]);

    if (fechaExpiracion) {
      const { error: errorEvento } = await supabase
        .from('evento')
        .insert({
          negocio_organizador_id: negocio.id,
          nombre,
          fecha_inicio: new Date().toISOString().slice(0, 10),
          fecha_fin: fechaExpiracion,
          ubicacion: negocio.nombre,
          descripcion: `Actividad de sello: ${nombre}`,
        });

      if (errorEvento) {
        console.error('Error creando evento para la actividad QR:', errorEvento);
        // No bloqueamos el éxito de la actividad por esto: qr_sello ya se creó bien.
      }
    }

    return { exito: true };
  }, [negocio]);

  const eliminarActividadQR = useCallback(async (id) => {
    const { error } = await supabase
      .from('qr_sello')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error eliminando actividad QR:', error);
      if (error.code === '23503') {
        return { exito: false, mensaje: 'No se puede eliminar: esta actividad ya tiene sellos canjeados.' };
      }
      return { exito: false, mensaje: 'No se pudo eliminar la actividad. Intenta de nuevo.' };
    }

    setActividadesQR((prev) => prev.filter((a) => a.id !== id));
    return { exito: true };
  }, []);

  return {
    negocio,
    cargando,
    horarios,
    fotos,
    productos,
    registrar,
    actualizarHorarios,
    actualizarUbicacion,
    actualizarPerfil,
    subirLogo,
    subirFoto,
    eliminarFoto,
    agregarProducto,
    eliminarProducto,
    actividadesQR,
    crearActividadQR,
    eliminarActividadQR,
  };
}
