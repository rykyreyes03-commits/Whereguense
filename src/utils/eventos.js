// Datos y formato compartidos por la agenda de eventos (lista, detalle, formulario de actividad).

// Mismas categorías que el CHECK de actividad_negocio y evento (028).
export const CATEGORIAS = [
  { id: 'gastronomia', etiqueta: 'Gastronomía' },
  { id: 'cultura', etiqueta: 'Cultura' },
  { id: 'folklore', etiqueta: 'Folklore' },
  { id: 'musica', etiqueta: 'Música' },
  { id: 'artesania', etiqueta: 'Artesanía' },
  { id: 'feria', etiqueta: 'Feria' },
  { id: 'taller', etiqueta: 'Taller' },
  { id: 'otro', etiqueta: 'Otro' },
];

export function etiquetaCategoria(id) {
  return CATEGORIAS.find((c) => c.id === id)?.etiqueta || null;
}

// "Otro" lleva su propio texto ("¿Cuál?", 029): máximo 40 caracteres.
export const MAX_CATEGORIA_OTRO = 40;

// Lo que se ve donde la categoría: la etiqueta de la lista o, con "Otro", el texto que escribió el organizador.
export function textoCategoria(id, otro) {
  if (id === 'otro') return String(otro || '').trim() || etiquetaCategoria('otro');
  return etiquetaCategoria(id);
}

// Límites de las etiquetas (028): máximo 6, de 1 a 24 caracteres, sin repetir.
export const MAX_ETIQUETAS = 6;
export const MAX_LARGO_ETIQUETA = 24;

// "  #Café   Tradicional " -> "Café Tradicional"
export function normalizarEtiqueta(texto) {
  return String(texto || '').replace(/^#+/, '').replace(/\s+/g, ' ').trim();
}

// Para detectar repetidas: ignora mayúsculas y espacios en los extremos (igual que la base).
export function claveEtiqueta(texto) {
  return normalizarEtiqueta(texto).toLowerCase();
}

// Las fechas llegan como 'YYYY-MM-DD' (o ISO): se leen como día local para que en Nicaragua
// (UTC-6) no caigan el día anterior.
export function aFecha(iso) {
  return new Date(`${String(iso).slice(0, 10)}T00:00:00`);
}

// 'YYYY-MM-DD' de hoy en hora local (toISOString da el día UTC, que de noche en Nicaragua ya es mañana).
export function hoyISO(fecha = new Date()) {
  const y = fecha.getFullYear();
  const m = String(fecha.getMonth() + 1).padStart(2, '0');
  const d = String(fecha.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function sumarDias(iso, dias) {
  const f = aFecha(iso);
  f.setDate(f.getDate() + dias);
  return hoyISO(f);
}

const MES_CORTO = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
const mesLargo = (d) => d.toLocaleDateString('es-NI', { month: 'long' });
const diaMesLargo = (d) => d.toLocaleDateString('es-NI', { day: 'numeric', month: 'long' });

// "16-27 OCT", "16 OCT" o "30 OCT-2 NOV"
export function rangoCorto(inicio, fin) {
  if (!inicio) return '';
  const a = aFecha(inicio);
  const b = fin ? aFecha(fin) : a;
  if (a.getTime() === b.getTime()) return `${a.getDate()} ${MES_CORTO[a.getMonth()]}`;
  if (a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear()) {
    return `${a.getDate()}-${b.getDate()} ${MES_CORTO[a.getMonth()]}`;
  }
  return `${a.getDate()} ${MES_CORTO[a.getMonth()]}-${b.getDate()} ${MES_CORTO[b.getMonth()]}`;
}

// "16 de octubre - 27 de octubre" (o un solo día)
export function rangoLargo(inicio, fin) {
  if (!inicio) return '';
  const a = aFecha(inicio);
  const b = fin ? aFecha(fin) : a;
  if (a.getTime() === b.getTime()) return diaMesLargo(a);
  return `${diaMesLargo(a)} - ${diaMesLargo(b)}`;
}

// Para listas compactas: "12 de noviembre", "5 al 6 de octubre" o "30 de octubre al 2 de noviembre".
// El año solo aparece si no es el actual.
export function rangoEscrito(inicio, fin) {
  if (!inicio) return '';
  const a = aFecha(inicio);
  const b = fin ? aFecha(fin) : a;
  const anio = b.getFullYear() !== new Date().getFullYear() ? ` de ${b.getFullYear()}` : '';
  if (a.getTime() === b.getTime()) return `${diaMesLargo(a)}${anio}`;
  if (a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear()) {
    return `${a.getDate()} al ${diaMesLargo(b)}${anio}`;
  }
  return `${diaMesLargo(a)} al ${diaMesLargo(b)}${anio}`;
}

// "16 — 27 de octubre de 2026"
export function rangoConAnio(inicio, fin) {
  if (!inicio) return '';
  const a = aFecha(inicio);
  const b = fin ? aFecha(fin) : a;
  if (a.getTime() === b.getTime()) return `${diaMesLargo(a)} de ${a.getFullYear()}`;
  if (a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear()) {
    return `${a.getDate()} — ${b.getDate()} de ${mesLargo(a)} de ${a.getFullYear()}`;
  }
  if (a.getFullYear() === b.getFullYear()) {
    return `${diaMesLargo(a)} — ${diaMesLargo(b)} de ${a.getFullYear()}`;
  }
  return `${diaMesLargo(a)} de ${a.getFullYear()} — ${diaMesLargo(b)} de ${b.getFullYear()}`;
}

// Las horas se guardan en 24 h ('19:00:00') y se muestran siempre igual: '7:00 PM', '12:30 AM'.
// '09:00:00' -> '9:00 AM'; '18:30' -> '6:30 PM'; '00:00' -> '12:00 AM'
export function horaCorta(hora) {
  if (!hora) return '';
  const [h, m] = String(hora).split(':').map(Number);
  if (Number.isNaN(h)) return '';
  const sufijo = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m || 0).padStart(2, '0')} ${sufijo}`;
}

// '9:00 AM - 6:00 PM'; vacío si falta alguna de las dos (en la base van las dos o ninguna).
export function rangoHoras(inicio, fin) {
  if (!inicio || !fin) return '';
  return `${horaCorta(inicio)} - ${horaCorta(fin)}`;
}

// Minutos desde medianoche de '19:30' o '19:30:00'; null si no es una hora.
function minutosDe(hora) {
  if (!hora) return null;
  const [h, m] = String(hora).split(':').map(Number);
  return Number.isNaN(h) ? null : h * 60 + (m || 0);
}

// Verdadero si la hora de fin queda antes que la de inicio (la actividad termina pasada la medianoche).
export function terminaAlDiaSiguiente(inicio, fin) {
  const a = minutosDe(inicio);
  const b = minutosDe(fin);
  return a !== null && b !== null && b < a;
}

// 'Termina a las 2:00 AM del día siguiente' (vacío si no cruza la medianoche).
export function notaDiaSiguiente(inicio, fin) {
  return terminaAlDiaSiguiente(inicio, fin) ? `Termina a las ${horaCorta(fin)} del día siguiente` : '';
}

// 'sábado 5 de octubre'
export function fechaEscrita(iso) {
  if (!iso) return '';
  // es-NI separa con coma ('lunes, 5 de octubre'); se escribe sin ella.
  return aFecha(iso).toLocaleDateString('es-NI', { weekday: 'long', day: 'numeric', month: 'long' }).replace(',', '');
}

// Conversión entre el control de horas (1-12, minutos, AM/PM) y el valor guardado ('HH:MM', 24 h).
export function a24h(hora12, minutos, periodo) {
  const h = (Number(hora12) % 12) + (periodo === 'PM' ? 12 : 0);
  return `${String(h).padStart(2, '0')}:${String(minutos).padStart(2, '0')}`;
}

// '19:30' -> { hora: 7, minutos: 30, periodo: 'PM' }; sin valor, null.
export function de24h(hora) {
  const total = minutosDe(hora);
  if (total === null) return null;
  const h = Math.floor(total / 60);
  return { hora: h % 12 === 0 ? 12 : h % 12, minutos: total % 60, periodo: h >= 12 ? 'PM' : 'AM' };
}

// Lo que ve el turista de una actividad de un negocio (fila de actividad_negocio o de actividades_negocio_publicas()).
// La agenda (useEventosPublicos) y la pantalla de detalle del dueño usan esta misma función: así lo que el dueño
// ve en "Así lo ven los turistas" es lo que de verdad se publica.
export function eventoDesdeActividad(a, organizador = null) {
  return {
    id: `actividad-${a.id}`,
    nombre: a.nombre,
    fechaInicio: a.fecha_inicio,
    fechaFin: a.fecha_fin,
    horaInicio: a.hora_inicio || null,
    horaFin: a.hora_fin || null,
    lugar: a.lugar || '',
    ubicacion: a.lugar || organizador?.nombre || '',
    descripcion: a.descripcion || '',
    detalles: a.detalles || '',
    eslogan: a.eslogan || '',
    categoria: a.categoria || null,
    categoriaOtro: a.categoria_otro || null,
    etiquetas: a.etiquetas || [],
    sitioRelacionado: null,
    imagenUrl: a.foto_url || null,
    negocioId: a.negocio_id,
    organizador,
    tieneSello: a.estado_sello === 'aprobado',
  };
}

// Ruta dentro del bucket "negocios" de una foto guardada por su URL pública
// (…/storage/v1/object/public/negocios/<uid>/actividades/<n>.jpg -> <uid>/actividades/<n>.jpg).
export function rutaFotoDeUrl(url) {
  const m = /\/object\/public\/negocios\/([^?#]+)/.exec(String(url || ''));
  return m ? m[1] : null;
}

// ---------------------------------------------------------------------------------------------------------------
// Cuándo termina una actividad. REGLA ÚNICA (la misma que fin_de_actividad() en la base, migración 031):
// termina en fecha_fin + hora_fin, hora de Managua (UTC-6 todo el año; Nicaragua no usa horario de verano). Si
// hora_fin es menor que hora_inicio termina al día siguiente (actividad nocturna). Sin hora, termina al final del día
// (a las 00:00 del día siguiente). Está terminada cuando "ahora" >= ese instante. No depende de la zona del teléfono.
// ---------------------------------------------------------------------------------------------------------------
const DESFASE_MANAGUA_H = 6;
const DIA_MS = 24 * 60 * 60 * 1000;

// 'HH:MM[:SS[.fff]]' -> segundos desde medianoche; null si no es una hora válida (formato estricto, como una columna time).
function segundosDe(hora) {
  if (!hora) return null;
  const m = /^(\d{1,2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?$/.exec(String(hora).trim());
  if (!m) return null;
  const [h, mi, s] = [Number(m[1]), Number(m[2]), Number(m[3] || 0)];
  return h <= 24 && mi < 60 && s < 60 ? h * 3600 + mi * 60 + s : null;
}

// Instante (ms desde 1970) en que termina la actividad o el evento, o null si no tiene fecha de fin.
// Acepta los nombres del front (fechaFin, horaInicio, horaFin) y los de la base (fecha_fin, hora_inicio, hora_fin).
export function finDeEvento(e) {
  const fechaFin = e?.fechaFin ?? e?.fecha_fin;
  if (!fechaFin) return null;
  const f = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(fechaFin));
  if (!f) return null;
  const [y, m, d] = [Number(f[1]), Number(f[2]), Number(f[3])];
  if (y < 1000 || m < 1 || m > 12 || d < 1 || d > 31) return null;
  const inicio = segundosDe(e.horaInicio ?? e.hora_inicio);
  const fin = segundosDe(e.horaFin ?? e.hora_fin);
  if (fin === null) return Date.UTC(y, m - 1, d + 1, DESFASE_MANAGUA_H, 0, 0); // sin hora: al final del día
  const cruzaMedianoche = inicio !== null && fin < inicio;
  return Date.UTC(y, m - 1, d, DESFASE_MANAGUA_H, 0, fin) + (cruzaMedianoche ? DIA_MS : 0);
}

// ¿Ya terminó? Sin fecha de fin no se puede saber: se considera que no.
export function eventoTermino(e, ahora = Date.now()) {
  const fin = finDeEvento(e);
  return fin !== null && ahora >= fin;
}

// 'YYYY-MM-DD' de hoy en Managua (UTC-6), sin importar la zona del teléfono ni si ya es "mañana" en UTC.
export function hoyManagua(ahora = Date.now()) {
  return new Date(ahora - DESFASE_MANAGUA_H * 3600 * 1000).toISOString().slice(0, 10);
}

// 'YYYY-MM-DD' del último día en que el evento está "en curso" en Managua: una actividad nocturna de 7 PM a 2 AM con
// fecha_fin el 18 sigue en curso el 19 hasta las 2 AM, así que su último día es el 19. Sirve para los filtros por día
// ("Hoy", "Esta semana"). Sin fecha de fin, null.
export function diaDeFin(e) {
  const fin = finDeEvento(e);
  return fin === null ? null : hoyManagua(fin - 1);
}

// El evento que se arma con lo que se guardó al marcarlo como favorito (guardado.datos). Se usa cuando el evento ya
// terminó y la base ya no lo devuelve: muestra lo guardado (nombre, fechas, horas, lugar, foto, categoría y organizador)
// y nada más: sin descripción, detalles, etiquetas ni perfil del negocio.
export function eventoDesdeGuardado(id, datos = {}) {
  return {
    id,
    nombre: datos.nombre || 'Sin nombre',
    fechaInicio: datos.fechaInicio || null,
    fechaFin: datos.fechaFin || null,
    horaInicio: datos.horaInicio || null,
    horaFin: datos.horaFin || null,
    lugar: datos.lugar || '',
    ubicacion: datos.lugar || '',
    descripcion: '',
    detalles: '',
    eslogan: '',
    categoria: datos.categoria || null,
    categoriaOtro: null,
    etiquetas: [],
    sitioRelacionado: null,
    imagenUrl: datos.imagenUrl || null,
    negocioId: null,
    organizador: datos.organizador ? { nombre: datos.organizador } : null, // sin id: no hay "Ver perfil"
    tieneSello: false,
    desdeGuardado: true,
  };
}

// Un cupón vence en su fecha_expiracion (instante exacto, igual que usar_cupon y obtener_cupon en la base).
export function cuponVencido(cupon, ahora = Date.now()) {
  return Boolean(cupon?.fecha_expiracion) && instanteDe(cupon.fecha_expiracion) < ahora;
}

// Instante (ms) de una fecha con hora de la base. Acepta ISO ('2026-10-10T05:59:59+00:00') y el formato de Postgres
// ('2026-10-10 05:59:59+00'), que algunos WebView no leen tal cual. Si no se entiende da NaN (y NaN no es "vencido":
// la base manda al usar el cupón).
export function instanteDe(valor) {
  const texto = String(valor).trim().replace(' ', 'T').replace(/([+-]\d{2})$/, '$1:00');
  return Date.parse(texto);
}

export function inicialDe(nombre) {
  return String(nombre || '').trim().charAt(0).toUpperCase() || '?';
}

// El evento que destaca Inicio: el que está en curso hoy (si hay varios, el que empezó antes) y, si ninguno lo está, el
// próximo en empezar, sin importar cuántos días falten. Lo que ya terminó no cuenta. `hoy` es 'YYYY-MM-DD' de Managua.
export function eventoParaInicio(eventos, hoy) {
  const vigentes = (eventos || []).filter((e) => {
    const ultimo = diaDeFin(e);
    return ultimo === null ? e.fechaInicio >= hoy : ultimo >= hoy;
  });
  const enCurso = (e) => e.fechaInicio <= hoy;
  return [...vigentes].sort((a, b) => {
    if (enCurso(a) !== enCurso(b)) return enCurso(a) ? -1 : 1;
    return a.fechaInicio.localeCompare(b.fechaInicio);
  })[0] || null;
}

// ¿Empieza el evento dentro de esta semana (o ya está en curso)? Misma ventana que el filtro "Esta semana" de Eventos: hoy y 6 días más.
export function esDeEstaSemana(e, hoy) {
  return e.fechaInicio <= sumarDias(hoy, 6);
}
