// Supabase simulado para probar la interfaz de reseñas en el navegador sin tocar la base real.
// Imita las funciones de la migración 032 (mismas validaciones y mensajes). El estado vive en window.__db, que la prueba
// deja listo con page.addInitScript antes de cargar la página:
//   { uid, sesion, puede, resenas: [{ id, negocio_id, negocio, usuario_id, autor, calificacion, comentario, fecha,
//     respuesta, fecha_respuesta }], tablas: { actividad_negocio: [...] }, llamadas: [] }

const db = () => window.__db;

function resumen(negocioId) {
  const r = db().resenas.filter((x) => x.negocio_id === negocioId);
  const cuenta = (n) => r.filter((x) => x.calificacion === n).length;
  const prom = r.length ? Math.round((r.reduce((a, x) => a + x.calificacion, 0) / r.length) * 10) / 10 : null;
  return [{ promedio: prom, total: r.length, uno: cuenta(1), dos: cuenta(2), tres: cuenta(3), cuatro: cuenta(4), cinco: cuenta(5) }];
}

const funciones = {
  resumen_resenas: ({ p_negocio_id }) => resumen(p_negocio_id),
  resenas_publicas: ({ p_negocio_id }) => db().resenas
    .filter((x) => x.negocio_id === p_negocio_id)
    .sort((a, b) => b.fecha.localeCompare(a.fecha) || b.id - a.id)
    .map((x) => ({ id: x.id, autor: x.autor, calificacion: x.calificacion, comentario: x.comentario, fecha: x.fecha,
      respuesta: x.respuesta || null, fecha_respuesta: x.fecha_respuesta || null, es_mia: x.usuario_id === db().uid })),
  puede_resenar: () => db().puede === true,
  guardar_resena: ({ p_negocio_id, p_calificacion, p_comentario }) => {
    const c = (p_comentario || '').trim();
    if (!p_calificacion || p_calificacion < 1 || p_calificacion > 5) return { exito: false, mensaje: 'Elige de 1 a 5 estrellas.' };
    if (c.length < 10) return { exito: false, mensaje: 'Escribe un comentario de al menos 10 caracteres.' };
    if (c.length > 2000) return { exito: false, mensaje: 'El comentario puede tener hasta 2000 caracteres.' };
    if (db().falla === 'guardar') return { exito: false, mensaje: 'Escanea el sello de este negocio para poder dejar tu reseña.' };
    const previa = db().resenas.find((x) => x.negocio_id === p_negocio_id && x.usuario_id === db().uid);
    if (previa) {
      previa.calificacion = p_calificacion;
      previa.comentario = c;
      return { exito: true, mensaje: 'Tu reseña se actualizó.', id: previa.id, editada: true };
    }
    const id = Math.max(0, ...db().resenas.map((x) => x.id)) + 1;
    db().resenas.push({ id, negocio_id: p_negocio_id, negocio: 'Café Colibrí', usuario_id: db().uid, autor: 'Viajero',
      calificacion: p_calificacion, comentario: c, fecha: '2026-10-06T12:00:00Z' });
    return { exito: true, mensaje: 'Gracias por tu reseña.', id, editada: false };
  },
  responder_resena: ({ p_resena_id, p_respuesta }) => {
    const r = db().resenas.find((x) => x.id === p_resena_id);
    const t = (p_respuesta || '').trim();
    if (!r) return { exito: false, mensaje: 'No tienes permiso sobre esta reseña.' };
    if (!t) return { exito: false, mensaje: 'Escribe tu respuesta.' };
    const nueva = !r.respuesta;
    r.respuesta = t;
    r.fecha_respuesta = '2026-10-06T13:00:00Z';
    return { exito: true, mensaje: nueva ? 'Respuesta publicada.' : 'Respuesta actualizada.' };
  },
  admin_resenas: () => db().resenas.map((x) => ({ id: x.id, negocio_id: x.negocio_id, negocio: x.negocio, autor: x.autor,
    calificacion: x.calificacion, comentario: x.comentario, fecha: x.fecha, respuesta: x.respuesta || null,
    fecha_respuesta: x.fecha_respuesta || null })),
  admin_borrar_resena: ({ p_resena_id }) => {
    db().resenas = db().resenas.filter((x) => x.id !== p_resena_id);
    return { exito: true, mensaje: 'Reseña eliminada.' };
  },
  admin_aprobar_sello: ({ p_actividad_id }) => { db().llamadas.push(['aprobar', p_actividad_id]); return { exito: true, mensaje: 'Sello aprobado.' }; },
  admin_rechazar_sello: ({ p_actividad_id }) => { db().llamadas.push(['rechazar', p_actividad_id]); return { exito: true, mensaje: 'Sello rechazado.' }; },
};

// Resultado encadenable y "esperable": .eq().gte().order().select() devuelven lo mismo; await da { data, error }.
function resultado(datos) {
  const r = { data: datos, error: null };
  const cadena = {
    eq: () => cadena, gte: () => cadena, order: () => cadena, select: () => cadena, in: () => cadena,
    then: (ok, mal) => Promise.resolve(r).then(ok, mal),
  };
  return cadena;
}

export const supabase = {
  from: (tabla) => resultado((db().tablas || {})[tabla] || []),
  rpc: (nombre, args) => {
    const f = funciones[nombre];
    return resultado(f ? f(args || {}) : []);
  },
  auth: { getSession: async () => ({ data: { session: db().sesion ? { user: { id: db().uid } } : null } }) },
};
