// Supabase simulado para probar la vista del sitio turístico sin tocar la base real. Imita la migración 037:
// sitio_foto (lectura), resenas_sitio_publicas, resumen_resenas_sitio, guardar_resena_sitio, eliminar_mi_resena_sitio.
// Estado en window.__db = { uid, sesion, fotos: [{id,url,orden,es_portada}], resenas: [{id,usuario_id,autor,estrellas,texto,fecha}] }
const db = () => window.__db;

const funciones = {
  resumen_resenas_sitio: () => {
    const r = db().resenas;
    const cuenta = (n) => r.filter((x) => x.estrellas === n).length;
    const prom = r.length ? Math.round((r.reduce((a, x) => a + x.estrellas, 0) / r.length) * 10) / 10 : null;
    return [{ promedio: prom, total: r.length, uno: cuenta(1), dos: cuenta(2), tres: cuenta(3), cuatro: cuenta(4), cinco: cuenta(5) }];
  },
  resenas_sitio_publicas: () => [...db().resenas].sort((a, b) => b.fecha.localeCompare(a.fecha))
    .map((x) => ({ id: x.id, autor: x.autor, estrellas: x.estrellas, texto: x.texto, fecha: x.fecha, es_mia: x.usuario_id === db().uid })),
  guardar_resena_sitio: ({ p_estrellas, p_texto }) => {
    const t = (p_texto || '').trim();
    if (!p_estrellas || p_estrellas < 1 || p_estrellas > 5) return { exito: false, mensaje: 'Elige de 1 a 5 estrellas.' };
    if (t.length < 10) return { exito: false, mensaje: 'Escribe un comentario de al menos 10 caracteres.' };
    if (t.length > 1000) return { exito: false, mensaje: 'El comentario puede tener hasta 1000 caracteres.' };
    db().llamadas.push(['guardar', p_estrellas, t]);
    const previa = db().resenas.find((x) => x.usuario_id === db().uid);
    if (previa) { previa.estrellas = p_estrellas; previa.texto = t; return { exito: true, mensaje: 'Tu reseña se actualizó.', editada: true }; }
    db().resenas.push({ id: 'n' + db().resenas.length, usuario_id: db().uid, autor: 'Viajero', estrellas: p_estrellas, texto: t, fecha: '2026-10-06T12:00:00Z' });
    return { exito: true, mensaje: 'Gracias por tu reseña.', editada: false };
  },
  eliminar_mi_resena_sitio: () => {
    db().llamadas.push(['eliminar']);
    const antes = db().resenas.length;
    db().resenas = db().resenas.filter((x) => x.usuario_id !== db().uid);
    return antes === db().resenas.length ? { exito: false, mensaje: 'No tienes una reseña en este sitio.' } : { exito: true, mensaje: 'Reseña eliminada.' };
  },
};

function resultado(datos) {
  const r = { data: datos, error: null };
  const cadena = { eq: () => cadena, order: () => cadena, select: () => cadena, limit: () => cadena, then: (ok, mal) => Promise.resolve(r).then(ok, mal) };
  return cadena;
}

export const supabase = {
  // sitio_foto: el mock no filtra por es_portada; para el panel se pasa db().portada ya resuelta.
  from: (tabla) => resultado(tabla === 'sitio_foto' ? (db().portada !== undefined ? db().portada : db().fotos) : tabla === 'sitio' ? (db().sitioFila || []) : []),
  rpc: (nombre, args) => resultado(funciones[nombre] ? funciones[nombre](args || {}) : []),
  auth: { getSession: async () => ({ data: { session: db().sesion ? { user: { id: db().uid } } : null } }) },
};
