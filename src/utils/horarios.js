// Horarios de un negocio (negocio_horario) y "Abierto ahora", todo en hora de Managua (UTC-6 fijo, igual que utils/eventos.js).
// Una fila: { dia_semana 0=domingo..6, hora_apertura 'HH:MM[:SS]', hora_cierre, cerrado }.
import { horaCorta } from './eventos.js';

const DESFASE_MANAGUA_H = 6;
const NOMBRES_DIA = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const NOMBRES_CORTOS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

function minutos(hora) {
  if (!hora) return null;
  const [h, m] = String(hora).split(':').map(Number);
  return Number.isNaN(h) ? null : h * 60 + (m || 0);
}

// Día de la semana (0=domingo) y minuto del día en Managua.
export function ahoraEnManagua(ahora = Date.now()) {
  const d = new Date(ahora - DESFASE_MANAGUA_H * 3600 * 1000);
  return { dia: d.getUTCDay(), minuto: d.getUTCHours() * 60 + d.getUTCMinutes() };
}

// Tramo de un día en minutos: [apertura, cierre]; si el cierre es menor o igual a la apertura, cierra al día siguiente
// (cierre + 24 h). null si el día está cerrado o sin horas.
function tramo(fila) {
  if (!fila || fila.cerrado) return null;
  const a = minutos(fila.hora_apertura);
  const c = minutos(fila.hora_cierre);
  if (a === null || c === null) return null;
  return [a, c > a ? c : c + 24 * 60];
}

// { abierto, texto } o null si el negocio no publicó horarios.
//   abierto:  'Abierto ahora · cierra 6:00 PM'
//   cerrado:  'Cerrado · abre hoy 8:00 AM' / 'abre mañana ...' / 'abre el lunes ...'
export function estadoAbierto(horarios, ahora = Date.now()) {
  if (!Array.isArray(horarios) || horarios.length === 0) return null;
  const porDia = new Map(horarios.map((h) => [Number(h.dia_semana), h]));
  const { dia, minuto } = ahoraEnManagua(ahora);

  // ¿Sigue abierto desde ayer (tramo que cruza la medianoche)?
  const ayer = tramo(porDia.get((dia + 6) % 7));
  if (ayer && ayer[1] > 24 * 60 && minuto < ayer[1] - 24 * 60) {
    return { abierto: true, texto: `Abierto ahora · cierra ${horaCorta(porDia.get((dia + 6) % 7).hora_cierre)}` };
  }
  const hoy = tramo(porDia.get(dia));
  if (hoy && minuto >= hoy[0] && minuto < hoy[1]) {
    return { abierto: true, texto: `Abierto ahora · cierra ${horaCorta(porDia.get(dia).hora_cierre)}` };
  }
  // Próxima apertura: hoy si aún no abrió, si no el siguiente día con horario.
  if (hoy && minuto < hoy[0]) {
    return { abierto: false, texto: `Cerrado · abre hoy ${horaCorta(porDia.get(dia).hora_apertura)}` };
  }
  for (let i = 1; i <= 7; i += 1) {
    const d = (dia + i) % 7;
    if (tramo(porDia.get(d))) {
      const cuando = i === 1 ? 'mañana' : `el ${NOMBRES_DIA[d].toLowerCase()}`;
      return { abierto: false, texto: `Cerrado · abre ${cuando} ${horaCorta(porDia.get(d).hora_apertura)}` };
    }
  }
  return { abierto: false, texto: 'Cerrado' };
}

// Agrupa días consecutivos (lunes a domingo) con el mismo horario: 'Lun a Sáb' · '8:00 AM - 6:00 PM'; 'Dom' · 'Cerrado'.
export function resumenHorarios(horarios) {
  const orden = [1, 2, 3, 4, 5, 6, 0];
  const porDia = new Map((horarios || []).map((h) => [Number(h.dia_semana), h]));
  const texto = (h) => (!h || h.cerrado ? 'Cerrado' : `${horaCorta(h.hora_apertura)} - ${horaCorta(h.hora_cierre)}`);
  const grupos = [];
  orden.forEach((d) => {
    if (!porDia.has(d)) return;
    const t = texto(porDia.get(d));
    const ultimo = grupos[grupos.length - 1];
    if (ultimo && ultimo.texto === t && ultimo.siguiente === d) {
      ultimo.fin = d;
      ultimo.siguiente = orden[(orden.indexOf(d) + 1) % 7];
    } else {
      grupos.push({ inicio: d, fin: d, texto: t, siguiente: orden[(orden.indexOf(d) + 1) % 7] });
    }
  });
  return grupos.map((g) => ({
    dias: g.inicio === g.fin ? NOMBRES_CORTOS[g.inicio] : `${NOMBRES_CORTOS[g.inicio]} a ${NOMBRES_CORTOS[g.fin]}`,
    horas: g.texto,
  }));
}
