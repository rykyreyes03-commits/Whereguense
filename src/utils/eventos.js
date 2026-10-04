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

// '09:00:00' -> '9AM'; '18:30' -> '6:30PM'
export function horaCorta(hora) {
  if (!hora) return '';
  const [h, m] = String(hora).split(':').map(Number);
  if (Number.isNaN(h)) return '';
  const sufijo = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return m ? `${h12}:${String(m).padStart(2, '0')}${sufijo}` : `${h12}${sufijo}`;
}

// '9AM-6PM'; vacío si falta alguna de las dos (en la base van las dos o ninguna).
export function rangoHoras(inicio, fin) {
  if (!inicio || !fin) return '';
  return `${horaCorta(inicio)}-${horaCorta(fin)}`;
}

export function inicialDe(nombre) {
  return String(nombre || '').trim().charAt(0).toUpperCase() || '?';
}
