// Prueba de qué evento destaca Inicio (eventoParaInicio) y de la ventana de "esta semana" (esDeEstaSemana).
// Uso: node docs/tests/sitio_front/evento_inicio.test.mjs
import { eventoParaInicio, esDeEstaSemana } from '../../../src/utils/eventos.js';

let total = 0;
const fallas = [];
const ok = (cond, texto) => { total += 1; if (!cond) fallas.push(texto); console.log(`${cond ? 'OK   ' : 'FALLA'} ${texto}`); };
const ev = (id, fechaInicio, fechaFin, extra = {}) => ({ id, nombre: id, fechaInicio, fechaFin, ...extra });
const id = (e) => (e ? e.id : null);

const HOY = '2026-10-07';
const gallina = ev('vendo gallina', '2026-10-16', '2026-10-27');

// El caso real: solo hay un evento y empieza dentro de 9 días
ok(id(eventoParaInicio([gallina], HOY)) === 'vendo gallina', 'el único evento (empieza el 16 de oct) aparece el 7 de oct');
ok(esDeEstaSemana(gallina, HOY) === false, 'el 16 de oct NO es "esta semana" el 7 de oct (el título pasa a "Próximo evento")');
ok(esDeEstaSemana(gallina, '2026-10-10') === true, 'el 10 de oct (el 16 queda a 6 días) ya es "esta semana"');
ok(esDeEstaSemana(gallina, '2026-10-09') === false, 'el 9 de oct el 16 queda a 7 días: fuera de la ventana de 7 días (hoy + 6)');

// Sin eventos
ok(eventoParaInicio([], HOY) === null && eventoParaInicio(undefined, HOY) === null, 'sin eventos -> null');

// En curso gana al próximo, aunque el próximo empiece antes en el calendario del listado
const enCurso = ev('en curso', '2026-10-05', '2026-10-12');
const proximo = ev('próximo', '2026-10-08', '2026-10-09');
ok(id(eventoParaInicio([proximo, enCurso, gallina], HOY)) === 'en curso', 'el evento en curso gana al próximo');
ok(esDeEstaSemana(enCurso, HOY) === true, 'un evento en curso es "de esta semana"');

// Varios en curso: el que empezó antes
const enCurso2 = ev('en curso 2', '2026-10-03', '2026-10-30');
ok(id(eventoParaInicio([enCurso, enCurso2], HOY)) === 'en curso 2', 'entre varios en curso, el que empezó primero');

// Varios próximos: el más cercano
const lejano = ev('lejano', '2026-12-01', '2026-12-02');
ok(id(eventoParaInicio([lejano, gallina], HOY)) === 'vendo gallina', 'entre varios próximos, el más cercano (sin límite de días)');
ok(id(eventoParaInicio([lejano], HOY)) === 'lejano', 'uno lejano (en dic) igual se muestra si no hay nada más cerca');

// Lo terminado no cuenta
const terminado = ev('terminado', '2026-10-01', '2026-10-06');
ok(id(eventoParaInicio([terminado], HOY)) === null, 'un evento que ya terminó no se muestra');
ok(id(eventoParaInicio([terminado, gallina], HOY)) === 'vendo gallina', 'lo terminado se ignora y sale el próximo');

// Termina hoy: sigue en curso hoy
const terminaHoy = ev('termina hoy', '2026-10-01', HOY);
ok(id(eventoParaInicio([terminaHoy, gallina], HOY)) === 'termina hoy', 'un evento que termina hoy sigue contando hoy');
// Termina de madrugada del día siguiente (nocturno): su último día es mañana
const nocturno = ev('nocturno', '2026-10-06', '2026-10-06', { horaInicio: '19:00', horaFin: '02:00' });
ok(id(eventoParaInicio([nocturno], HOY)) === 'nocturno', 'un evento nocturno que cruza la medianoche sigue en curso el día siguiente');

console.log(`\n${total - fallas.length}/${total} comprobaciones`);
if (fallas.length) { console.log('FALLAS:\n' + fallas.join('\n')); process.exit(1); }
