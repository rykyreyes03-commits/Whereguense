// Supabase simulado para probar la ficha, el editor de diseño y el mapa sin tocar la base real. El estado vive en window.__db:
//   { negocio: { config_diseno, logo_url, latitud, longitud }, negociosMapa: [filas de negocio activo para el mapa],
//     horarios: [...], productos: [...], fotos: [...], actividades: [...] }
const db = () => window.__db;

// Consulta encadenable y "esperable": .select().eq().gt().order() devuelven lo mismo; await da { data, error }.
// Lo que devuelve depende de la tabla y de las columnas pedidas (la ficha pide config_diseno; el mapa pide nombre_negocio).
function consulta(tabla) {
  let columnas = '';
  const datos = () => {
    const d = db();
    if (tabla === 'negocio') {
      if (columnas.includes('nombre_negocio')) return d.negociosMapa || [];
      return d.negocio ? [d.negocio] : [];
    }
    if (tabla === 'negocio_horario') return d.horarios || [];
    if (tabla === 'producto') return d.productos || [];
    if (tabla === 'negocio_foto') return d.fotos || [];
    return [];
  };
  const cadena = {
    select: (c) => { columnas = c || ''; return cadena; },
    eq: () => cadena, gte: () => cadena, gt: () => cadena, order: () => cadena, in: () => cadena,
    maybeSingle: () => Promise.resolve({ data: datos()[0] || null, error: null }),
    single: () => Promise.resolve({ data: datos()[0], error: null }),
    then: (ok, mal) => Promise.resolve({ data: datos(), error: null }).then(ok, mal),
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
  from: (tabla) => consulta(tabla),
  rpc: (nombre, args) => {
    const datos = (funciones[nombre] || (() => []))(args || {});
    const cadena = {
      eq: () => cadena, gte: () => cadena, order: () => cadena, select: () => cadena,
      then: (ok, mal) => Promise.resolve({ data: datos, error: null }).then(ok, mal),
    };
    return cadena;
  },
  auth: { getSession: async () => ({ data: { session: null } }) },
};
