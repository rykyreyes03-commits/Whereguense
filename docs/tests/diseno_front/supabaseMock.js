// Supabase simulado para probar la ficha y el editor de diseño sin tocar la base real. El estado vive en window.__db:
//   { negocio: { config_diseno, logo_url }, horarios: [...], productos: [...], fotos: [...], actividades: [...] }
const db = () => window.__db;

function resultado(datos) {
  const cadena = {
    eq: () => cadena, gte: () => cadena, order: () => cadena, select: () => cadena, in: () => cadena,
    maybeSingle: () => Promise.resolve({ data: Array.isArray(datos) ? datos[0] || null : datos, error: null }),
    single: () => Promise.resolve({ data: Array.isArray(datos) ? datos[0] : datos, error: null }),
    then: (ok, mal) => Promise.resolve({ data: datos, error: null }).then(ok, mal),
  };
  return cadena;
}

const funciones = {
  resumen_resenas: () => [{ promedio: 4.6, total: 12, uno: 0, dos: 0, tres: 1, cuatro: 3, cinco: 8 }],
  resenas_publicas: () => [{ id: 1, autor: 'Viajero', calificacion: 5, comentario: 'Muy buena atención y el café es increíble.', fecha: '2026-10-02T10:00:00Z', respuesta: null, fecha_respuesta: null, es_mia: false }],
  puede_resenar: () => false,
  actividades_negocio_publicas: () => db().actividades || [],
};

export const supabase = {
  from: (tabla) => {
    const d = db();
    if (tabla === 'negocio') return resultado(d.negocio ? [d.negocio] : []);
    if (tabla === 'negocio_horario') return resultado(d.horarios || []);
    if (tabla === 'producto') return resultado(d.productos || []);
    if (tabla === 'negocio_foto') return resultado(d.fotos || []);
    return resultado([]);
  },
  rpc: (nombre, args) => resultado((funciones[nombre] || (() => []))(args || {})),
  auth: { getSession: async () => ({ data: { session: null } }) },
};
