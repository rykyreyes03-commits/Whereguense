// docs/tests/031_regla_front.mjs
//
// Prueba de la regla única en el front (utils/eventos.js: finDeEvento / eventoTermino / hoyManagua / cuponVencido).
// Repite los casos A1 a A8 de docs/tests/031_lo_terminado_desaparece.sql (fin de actividad en America/Managua) con
// el mismo reloj simulado y debe dar lo mismo. Se corre con:  node docs/tests/031_regla_front.mjs
// y con otra zona del teléfono para comprobar que no depende de ella:  TZ=Asia/Tokyo node docs/tests/031_regla_front.mjs
// La FUENTE de los resultados esperados es la prueba de SQL (los dos archivos deben cambiar juntos).
import * as u from '../../src/utils/eventos.js';
const T = (s) => Date.parse(s);
const termino = (ff, hi, hf, ahora) => u.eventoTermino({ fechaFin: ff, horaInicio: hi, horaFin: hf }, T(ahora));
const c = [
  // A1 normal 15-18
  [termino('2026-10-10', '15:00', '18:00', '2026-10-10T23:59:59Z'), false], [termino('2026-10-10', '15:00', '18:00', '2026-10-11T00:00:00Z'), true], [termino('2026-10-10', '15:00', '18:00', '2026-10-11T00:00:01Z'), true],
  // A2 nocturna
  [termino('2026-10-18', '19:00', '02:00', '2026-10-19T03:00:00Z'), false], [termino('2026-10-18', '19:00', '02:00', '2026-10-19T07:59:59Z'), false], [termino('2026-10-18', '19:00', '02:00', '2026-10-19T08:00:00Z'), true], [termino('2026-10-18', '19:00', '02:00', '2026-10-19T08:00:01Z'), true],
  [termino('2026-10-18', '19:00', '02:00', '2026-10-19T06:30:00Z'), false],
  // A3 sin hora
  [termino('2026-10-10', null, null, '2026-10-11T05:59:59Z'), false], [termino('2026-10-10', null, null, '2026-10-11T06:00:00Z'), true],
  // A4 actividad 64 real
  [termino('2026-10-06', '04:03:00', '06:01:00', '2026-10-06T12:00:59Z'), false], [termino('2026-10-06', '04:03:00', '06:01:00', '2026-10-06T12:01:00Z'), true],
  // A5 hora_fin = hora_inicio
  [termino('2026-10-10', '10:00', '10:00', '2026-10-10T15:59:59Z'), false], [termino('2026-10-10', '10:00', '10:00', '2026-10-10T16:00:00Z'), true],
  // A6 varios días
  [termino('2026-10-12', '09:00', '17:00', '2026-10-12T00:00:00Z'), false], [termino('2026-10-12', '09:00', '17:00', '2026-10-12T22:59:59Z'), false], [termino('2026-10-12', '09:00', '17:00', '2026-10-12T23:00:00Z'), true],
  // A6b varios días con horario nocturno (10 al 12/oct, 7 PM a 2 AM): termina el 13/oct a las 2 AM
  [termino('2026-10-12', '19:00', '02:00', '2026-10-13T02:00:00Z'), false], [termino('2026-10-12', '19:00', '02:00', '2026-10-13T07:59:59Z'), false], [termino('2026-10-12', '19:00', '02:00', '2026-10-13T08:00:00Z'), true],
  // horas con segundos (como llegan de la base) y nocturna
  [termino('2026-10-18', '19:00:00', '02:00:00', '2026-10-19T07:59:59Z'), false], [termino('2026-10-18', '19:00:00', '02:00:00', '2026-10-19T08:00:00Z'), true],
  // formato estricto: una hora mal escrita cuenta como "sin hora" (fin del día); una fecha imposible no tiene fin
  [u.finDeEvento({ fechaFin: '2026-10-10', horaFin: '6 PM' }) === u.finDeEvento({ fechaFin: '2026-10-10' }), true], [u.finDeEvento({ fechaFin: '2026-13-45' }), null],
  // diaDeFin: el último día en curso (una nocturna con fecha_fin el 18 sigue el 19 hasta las 2 AM)
  [u.diaDeFin({ fechaFin: '2026-10-18', horaInicio: '19:00', horaFin: '02:00' }), '2026-10-19'], [u.diaDeFin({ fechaFin: '2026-10-10', horaInicio: '15:00', horaFin: '18:00' }), '2026-10-10'], [u.diaDeFin({ fechaFin: '2026-10-10' }), '2026-10-10'], [u.diaDeFin({}), null],
  // cupón con el formato de Postgres
  [u.cuponVencido({ fecha_expiracion: '2026-10-10 05:59:59+00' }, T('2026-10-10T06:00:00Z')), true], [u.cuponVencido({ fecha_expiracion: '2026-10-10 05:59:59+00' }, T('2026-10-10T05:00:00Z')), false],
  // A7 sin fecha_fin, A8 enero
  [u.finDeEvento({}), null], [new Date(u.finDeEvento({ fechaFin: '2027-01-15', horaInicio: '10:00', horaFin: '18:00' })).toISOString(), '2027-01-16T00:00:00.000Z'],
  // nombres de la base (snake_case) y segundos
  [u.eventoTermino({ fecha_fin: '2026-10-06', hora_inicio: '04:03:00', hora_fin: '06:01:00' }, T('2026-10-06T12:01:00Z')), true],
  // hoyManagua: 23:30 en Managua del 5/oct ya es 6/oct en UTC
  [u.hoyManagua(T('2026-10-06T05:30:00Z')), '2026-10-05'], [u.hoyManagua(T('2026-10-06T06:00:00Z')), '2026-10-06'], [u.hoyManagua(T('2026-10-06T12:37:00Z')), '2026-10-06'],
  // cupón
  [u.cuponVencido({ fecha_expiracion: '2026-10-10T05:59:59Z' }, T('2026-10-10T05:59:59Z')), false], [u.cuponVencido({ fecha_expiracion: '2026-10-10T05:59:59Z' }, T('2026-10-10T06:00:00Z')), true], [u.cuponVencido({ fecha_expiracion: null }, T('2030-01-01T00:00:00Z')), false],
];
let mal = 0; c.forEach(([a, b], i) => { if (a !== b) { mal++; console.log('MAL #' + i, JSON.stringify(a), '!=', JSON.stringify(b)); } });
console.log(mal ? 'fallos ' + mal : `todo ok (${c.length}) — mismos casos y resultados que A1 a A8 de la base`);
