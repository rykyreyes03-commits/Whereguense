import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { rutaFotoDeUrl } from '../utils/eventos';

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

// Columnas de actividad_negocio que ve el dueño (incluye foto_url y limite_canjes, 026).
const COLUMNAS_ACTIVIDAD = 'id, nombre, descripcion, foto_url, categoria, categoria_otro, lugar, fecha_inicio, fecha_fin, hora_inicio, hora_fin, eslogan, detalles, etiquetas, solicita_sello, limite_canjes, estado_sello, justificacion_sello, motivo_rechazo_sello, qr_sello_id, evento_id, fecha_creacion';

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
  const [actividades, setActividades] = useState([]);
  const [sellosEntregados, setSellosEntregados] = useState({}); // { [actividadId]: sellos que ya entregó }

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

  // Actividades del negocio (actividad_negocio, el dueño ve todas) y sus QR
  // (qr_sello vía mis_actividades_qr, que es lo único que devuelve el token).
  // Se recarga al abrir la pestaña Actividades para ver los sellos que el admin aprobó.
  const negocioId = negocio?.id;
  const cargarActividades = useCallback(async () => {
    if (!negocioId) {
      setActividades([]);
      setActividadesQR([]);
      return;
    }

    const [resActividades, resQR, resEntregados] = await Promise.all([
      supabase
        .from('actividad_negocio')
        .select(COLUMNAS_ACTIVIDAD)
        .eq('negocio_id', negocioId)
        .order('fecha_creacion', { ascending: false }),
      supabase.rpc('mis_actividades_qr', { p_negocio_id: negocioId }),
      supabase.rpc('sellos_entregados_por_actividad', { p_negocio_id: negocioId }),
    ]);

    // El dueño no puede leer la tabla sello (solo el propio turista): la cuenta llega por esta función.
    if (resEntregados.error) {
      console.error('Error cargando los sellos entregados:', resEntregados.error);
      setSellosEntregados({});
    } else {
      setSellosEntregados(Object.fromEntries((resEntregados.data || []).map((f) => [f.actividad_id, Number(f.entregados)])));
    }

    if (resActividades.error) {
      console.error('Error cargando actividades:', resActividades.error);
      setActividades([]);
    } else {
      setActividades(resActividades.data || []);
    }

    if (resQR.error) {
      console.error('Error cargando actividades QR:', resQR.error);
      setActividadesQR([]);
    } else if (!resQR.data.exito) {
      console.error('Error cargando actividades QR:', resQR.data.mensaje);
      setActividadesQR([]);
    } else {
      setActividadesQR(resQR.data.actividades || []);
    }
  }, [negocioId]);

  useEffect(() => {
    cargarActividades();
  }, [cargarActividades]);

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
  // Crea la actividad en actividad_negocio. Si pide sello, queda 'pendiente' (lo
  // decide el trigger) hasta que el admin la apruebe. Si tiene fechas, además se
  // publica como evento con crear_evento_desde_actividad.
  const crearActividad = useCallback(async ({ nombre, descripcion, fechaInicio, fechaFin, solicitaSello, justificacion, limiteCanjes, foto, categoria, categoriaOtro, lugar, horaInicio, horaFin, eslogan, detalles, etiquetas }) => {
    if (!negocio) return { exito: false, mensaje: 'No hay negocio para actualizar.' };

    // Foto: mismo bucket y mismo patrón que subirFoto (<uid>/<carpeta>/<timestamp>.<ext>),
    // en la subcarpeta "actividades". Se sube antes de insertar para guardar la URL.
    let fotoUrl = null;
    let rutaFoto = null;
    if (foto) {
      const extension = foto.name.split('.').pop();
      rutaFoto = `${usuarioId}/actividades/${Date.now()}.${extension}`;
      const { error: errorSubida } = await supabase.storage.from('negocios').upload(rutaFoto, foto);
      if (errorSubida) {
        console.error('Error subiendo la foto de la actividad:', errorSubida);
        return { exito: false, mensaje: 'No se pudo subir la foto. Intenta de nuevo.' };
      }
      fotoUrl = supabase.storage.from('negocios').getPublicUrl(rutaFoto).data.publicUrl;
    }

    const { data, error } = await supabase
      .from('actividad_negocio')
      .insert({
        negocio_id: negocio.id,
        nombre,
        descripcion: descripcion || null,
        foto_url: fotoUrl,
        fecha_inicio: fechaInicio || null,
        fecha_fin: fechaFin || null,
        solicita_sello: solicitaSello,
        justificacion_sello: solicitaSello ? justificacion : null,
        limite_canjes: solicitaSello ? (limiteCanjes || null) : null,
        // Campos del rediseño (028). El trigger de 029 exige categoría, descripción, foto, fechas, horas y lugar;
        // solo eslogan, detalles y etiquetas son opcionales.
        categoria: categoria || null,
        categoria_otro: categoria === 'otro' ? (categoriaOtro || null) : null,
        lugar: lugar || null,
        hora_inicio: horaInicio || null,
        hora_fin: horaFin || null,
        eslogan: eslogan || null,
        detalles: detalles || null,
        etiquetas: etiquetas && etiquetas.length > 0 ? etiquetas : null,
      })
      .select(COLUMNAS_ACTIVIDAD)
      .single();

    if (error) {
      console.error('Error creando actividad:', error);
      // No dejar la foto huérfana en Storage si la actividad no se guardó.
      if (rutaFoto) await supabase.storage.from('negocios').remove([rutaFoto]);
      // El trigger de 029 dice qué falta ('Faltan datos obligatorios de la actividad: foto, lugar.'): se muestra tal cual.
      const faltanDatos = error.code === '23514' && /^Faltan datos obligatorios/.test(error.message || '');
      return { exito: false, mensaje: faltanDatos ? error.message : 'No se pudo crear la actividad. Intenta de nuevo.' };
    }

    let actividad = data;
    let aviso = null;

    if (data.fecha_inicio && data.fecha_fin) {
      const { data: resEvento, error: errorEvento } = await supabase
        .rpc('crear_evento_desde_actividad', { p_actividad_id: data.id });

      if (errorEvento) {
        console.error('Error publicando el evento de la actividad:', errorEvento);
        aviso = 'La actividad se guardó, pero no se pudo publicar como evento.';
      } else if (!resEvento.exito) {
        aviso = `La actividad se guardó, pero no se publicó como evento: ${resEvento.mensaje}`;
      } else {
        actividad = { ...data, evento_id: resEvento.evento_id };
      }
    }

    setActividades((prev) => [actividad, ...prev]);
    return { exito: true, aviso };
  }, [negocio, usuarioId]);

  // Reenvía una solicitud de sello rechazada sobre la MISMA actividad. El trigger
  // actividad_negocio_estado_sello la vuelve a 'pendiente' solo si la justificación
  // cambió (021); si no cambió, la deja 'rechazado' sin error, por eso se valida aquí.
  const reenviarSolicitudSello = useCallback(async (actividadId, justificacion) => {
    const { data, error } = await supabase
      .from('actividad_negocio')
      .update({ solicita_sello: true, justificacion_sello: justificacion })
      .eq('id', actividadId)
      .select(COLUMNAS_ACTIVIDAD)
      .single();

    if (error) {
      console.error('Error reenviando la solicitud de sello:', error);
      return { exito: false, mensaje: 'No se pudo reenviar la solicitud. Intenta de nuevo.' };
    }
    if (data.estado_sello !== 'pendiente') {
      return { exito: false, mensaje: 'Cambia la explicación antes de volver a enviar la solicitud.' };
    }

    setActividades((prev) => prev.map((a) => (a.id === actividadId ? data : a)));
    return { exito: true };
  }, []);

  // Edita una actividad. Con el sello ya aprobado no se mandan fechas, sello ni límite (la base los protege).
  // Si se cambia la foto, la nueva se sube antes de guardar y la anterior se borra de Storage solo DESPUÉS de
  // guardar bien; si guardar falla, se borra la nueva. Un fallo al borrar la anterior no cuenta como error.
  const editarActividad = useCallback(async (id, { nombre, descripcion, fechaInicio, fechaFin, solicitaSello, justificacion, limiteCanjes, foto, categoria, categoriaOtro, lugar, horaInicio, horaFin, eslogan, detalles, etiquetas }) => {
    const actual = actividades.find((a) => a.id === id);
    if (!actual) return { exito: false, mensaje: 'No encontramos la actividad. Vuelve a abrir la pestaña.' };
    const aprobado = actual.estado_sello === 'aprobado';

    let fotoUrl = null;
    let rutaNueva = null;
    if (foto) {
      const extension = foto.name.split('.').pop();
      rutaNueva = `${usuarioId}/actividades/${Date.now()}.${extension}`;
      const { error: errorSubida } = await supabase.storage.from('negocios').upload(rutaNueva, foto);
      if (errorSubida) {
        console.error('Error subiendo la foto de la actividad:', errorSubida);
        return { exito: false, mensaje: 'No se pudo subir la foto. Intenta de nuevo.' };
      }
      fotoUrl = supabase.storage.from('negocios').getPublicUrl(rutaNueva).data.publicUrl;
    }

    const cambios = {
      nombre,
      descripcion: descripcion || null,
      ...(fotoUrl ? { foto_url: fotoUrl } : {}),
      categoria: categoria || null,
      categoria_otro: categoria === 'otro' ? (categoriaOtro || null) : null,
      lugar: lugar || null,
      hora_inicio: horaInicio || null,
      hora_fin: horaFin || null,
      eslogan: eslogan || null,
      detalles: detalles || null,
      etiquetas: etiquetas && etiquetas.length > 0 ? etiquetas : null,
      ...(aprobado ? {} : {
        fecha_inicio: fechaInicio || null,
        fecha_fin: fechaFin || null,
        solicita_sello: solicitaSello,
        justificacion_sello: solicitaSello ? justificacion : null,
        limite_canjes: solicitaSello ? (limiteCanjes || null) : null,
      }),
    };

    const { data, error } = await supabase
      .from('actividad_negocio')
      .update(cambios)
      .eq('id', id)
      .select(COLUMNAS_ACTIVIDAD)
      .single();

    if (error) {
      console.error('Error editando la actividad:', error);
      if (rutaNueva) {
        try { await supabase.storage.from('negocios').remove([rutaNueva]); } catch (e) { console.warn('No se pudo quitar la foto nueva:', e); }
      }
      // Los mensajes de la base ('Faltan datos obligatorios…', 'Esta actividad ya tiene un sello aprobado…') son claros: se muestran.
      const mensajeBase = (error.code === '23514' && /^Faltan datos obligatorios/.test(error.message || ''))
        || (error.code === '42501' && /^Esta actividad ya tiene un sello aprobado/.test(error.message || ''));
      return { exito: false, mensaje: mensajeBase ? error.message : 'No se pudo guardar los cambios. Intenta de nuevo.' };
    }

    // La foto anterior sobra (si ninguna otra actividad la usa): se borra ya con todo guardado.
    if (rutaNueva) {
      const rutaVieja = rutaFotoDeUrl(actual.foto_url);
      const compartida = actividades.some((a) => a.id !== id && rutaFotoDeUrl(a.foto_url) === rutaVieja);
      if (rutaVieja && !compartida) {
        try {
          const { error: errorBorrado } = await supabase.storage.from('negocios').remove([rutaVieja]);
          if (errorBorrado) console.warn('No se pudo borrar la foto anterior:', errorBorrado);
        } catch (e) {
          console.warn('No se pudo borrar la foto anterior:', e);
        }
      }
    }

    // Una actividad antigua sin fechas que ahora las tiene se publica como evento.
    let actividad = data;
    let aviso = null;
    if (data.fecha_inicio && data.fecha_fin && !data.evento_id) {
      const { data: resEvento, error: errorEvento } = await supabase
        .rpc('crear_evento_desde_actividad', { p_actividad_id: data.id });
      if (errorEvento || !resEvento?.exito) {
        console.error('Error publicando el evento de la actividad:', errorEvento || resEvento?.mensaje);
        aviso = 'Se guardaron los cambios, pero la actividad no se pudo publicar como evento.';
      } else {
        actividad = { ...data, evento_id: resEvento.evento_id };
      }
    }

    // Corregir una actividad con el sello rechazado y cambiar la justificación lo manda de nuevo a revisión: se avisa.
    if (!aviso && actual.estado_sello === 'rechazado' && data.estado_sello === 'pendiente') {
      aviso = 'Se guardaron los cambios y la solicitud del sello volvió a revisión.';
    }

    setActividades((prev) => prev.map((a) => (a.id === id ? actividad : a)));
    return { exito: true, aviso };
  }, [actividades, usuarioId]);

  // Elimina una actividad por completo (eliminar_actividad): su sello, su evento y los favoritos de quienes la guardaron.
  // La base rechaza si ya entregó sellos. La foto se borra de Storage con la ruta que devuelve la base; si eso falla,
  // la actividad ya está eliminada y no se avisa como error.
  const borrarActividad = useCallback(async (id) => {
    const { data, error } = await supabase.rpc('eliminar_actividad', { p_id: id });
    if (error || !data) {
      console.error('Error eliminando la actividad:', error);
      return { exito: false, mensaje: 'No se pudo eliminar la actividad. Intenta de nuevo.' };
    }
    if (!data.exito) return { exito: false, mensaje: data.mensaje };

    if (data.foto_ruta) {
      try {
        const { error: errorBorrado } = await supabase.storage.from('negocios').remove([data.foto_ruta]);
        if (errorBorrado) console.warn('No se pudo borrar la foto de la actividad:', errorBorrado);
      } catch (e) {
        console.warn('No se pudo borrar la foto de la actividad:', e);
      }
    }

    setActividades((prev) => prev.filter((a) => a.id !== id));
    setSellosEntregados((prev) => {
      const { [id]: _quitada, ...resto } = prev;
      return resto;
    });
    cargarActividades(); // el QR de su sello ya no existe: se vuelve a pedir la lista de QR
    return { exito: true };
  }, [cargarActividades]);

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
    actividades,
    actividadesQR,
    sellosEntregados,
    cargarActividades,
    crearActividad,
    editarActividad,
    borrarActividad,
    reenviarSolicitudSello,
    eliminarActividadQR,
  };
}
