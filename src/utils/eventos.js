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

export function inicialDe(nombre) {
  return String(nombre || '').trim().charAt(0).toUpperCase() || '?';
}
