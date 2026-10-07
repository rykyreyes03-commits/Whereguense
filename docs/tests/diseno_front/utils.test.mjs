// Pruebas de las reglas puras del diseño (src/utils/diseno.js) y de "Abierto ahora" (src/utils/horarios.js).
// Correr: node docs/tests/diseno_front/utils.test.mjs   (TZ da igual: todo se calcula en UTC-6 fijo)
import { SECCIONES, enlaceComoLlegar, PALETAS, contraste, textoSobre, disenoDesdeConfig, configDesdeDiseno, enlaceWhatsapp, variablesFicha, DISENO_POR_DEFECTO } from '../../../src/utils/diseno.js';
import { MAX_FOTOS, motivoDeRechazo, rutaDeFoto, moverElemento, ACEPTA_FOTOS } from '../../../src/utils/fotos.js';
import { rutaFotoDeUrl } from '../../../src/utils/eventos.js';
import { estadoAbierto, resumenHorarios, ahoraEnManagua } from '../../../src/utils/horarios.js';

let ok = 0, mal = 0;
const eq = (nombre, obtenido, esperado) => {
  const a = JSON.stringify(obtenido), b = JSON.stringify(esperado);
  if (a === b) ok += 1; else { mal += 1; console.log(`FALLA ${nombre}\n   obtuvo   ${a}\n   esperaba ${b}`); }
};

// --- contraste 4.5:1 en las 8 paletas, con el texto que se elige solo
for (const p of PALETAS) {
  const c = contraste(p.color, textoSobre(p.color));
  eq(`contraste ${p.id} >= 4.5 (${c.toFixed(2)})`, c >= 4.5, true);
}
eq('azul_marino lleva texto claro', textoSobre('#1B2A6B'), '#FFFFFF');
eq('dorado lleva texto oscuro o claro con >= 4.5', contraste('#B8860B', textoSobre('#B8860B')) >= 4.5, true);

// --- config <-> diseño
eq('{} -> defaults', disenoDesdeConfig({}), DISENO_POR_DEFECTO);
eq('null -> defaults', disenoDesdeConfig(null), DISENO_POR_DEFECTO);
eq('valores inválidos caen al default', disenoDesdeConfig({ paleta: 'rosa', letra: 'x', whatsapp: '12', layout_productos: 'g', secciones_visibles: ['x', 'fotos', 'fotos'] }),
  { ...DISENO_POR_DEFECTO, secciones: ['fotos'] });
eq('portada http se ignora', disenoDesdeConfig({ portada_url: 'http://x/y.jpg' }).portadaUrl, null);
eq('ida y vuelta', disenoDesdeConfig(configDesdeDiseno({ ...DISENO_POR_DEFECTO, paleta: 'rojo', whatsapp: '87074097', secciones: ['resenas', 'horarios'] })),
  { ...DISENO_POR_DEFECTO, paleta: 'rojo', whatsapp: '87074097', secciones: ['resenas', 'horarios'] });
eq('configDesdeDiseno sin whatsapp -> null', configDesdeDiseno(DISENO_POR_DEFECTO).whatsapp, null);
eq('whatsapp 8 dígitos -> 505', enlaceWhatsapp('87074097'), 'https://wa.me/50587074097');
eq('whatsapp con código', enlaceWhatsapp('50587074097'), 'https://wa.me/50587074097');
eq('whatsapp inválido -> null', enlaceWhatsapp('123'), null);
eq('variables', variablesFicha({ ...DISENO_POR_DEFECTO, paleta: 'terracota', letra: 'moderna' })['--ficha-color'], '#C0622A');

// --- Abierto ahora, hora de Managua (UTC-6). Instante = Date.UTC(...) con la hora UTC = managua + 6.
const managua = (anio, mes, dia, h, m = 0) => Date.UTC(anio, mes - 1, dia, h + 6, m); // 2026-10-05 es lunes
const fila = (d, a, c, cerrado = false) => ({ dia_semana: d, hora_apertura: a, hora_cierre: c, cerrado });
const semana = (a, c) => [0, 1, 2, 3, 4, 5, 6].map((d) => fila(d, a, c));

eq('Managua lunes 10:00 desde UTC', ahoraEnManagua(managua(2026, 10, 5, 10)), { dia: 1, minuto: 600 });
eq('medianoche UTC = 6 PM del día anterior', ahoraEnManagua(Date.UTC(2026, 9, 6, 0, 0)), { dia: 1, minuto: 18 * 60 });
eq('sin horarios -> null', estadoAbierto([], managua(2026, 10, 5, 10)), null);
eq('abierto 10:00', estadoAbierto(semana('08:00:00', '18:00:00'), managua(2026, 10, 5, 10)), { abierto: true, texto: 'Abierto ahora · cierra 6:00 PM' });
eq('justo a las 8:00 abre', estadoAbierto(semana('08:00', '18:00'), managua(2026, 10, 5, 8, 0)).abierto, true);
eq('justo a las 6:00 PM ya cerró', estadoAbierto(semana('08:00', '18:00'), managua(2026, 10, 5, 18, 0)).abierto, false);
eq('antes de abrir: abre hoy', estadoAbierto(semana('08:00', '18:00'), managua(2026, 10, 5, 7, 0)), { abierto: false, texto: 'Cerrado · abre hoy 8:00 AM' });
eq('después de cerrar: abre mañana', estadoAbierto(semana('08:00', '18:00'), managua(2026, 10, 5, 20, 0)), { abierto: false, texto: 'Cerrado · abre mañana 8:00 AM' });
// lunes a sábado abierto, domingo cerrado; sábado 7 PM -> abre el lunes
const sinDomingo = [fila(0, null, null, true), ...[1, 2, 3, 4, 5, 6].map((d) => fila(d, '08:00', '18:00'))];
eq('sábado tarde, domingo cerrado -> abre el lunes', estadoAbierto(sinDomingo, managua(2026, 10, 10, 19, 0)), { abierto: false, texto: 'Cerrado · abre el lunes 8:00 AM' });
eq('domingo cerrado', estadoAbierto(sinDomingo, managua(2026, 10, 11, 12, 0)).abierto, false);
// el servidor/teléfono en otra zona no cambia nada: el instante es el mismo
eq('el mismo instante da lo mismo (UTC 16:00 = Managua 10:00)', estadoAbierto(semana('08:00', '18:00'), Date.UTC(2026, 9, 5, 16, 0)).abierto, true);
eq('UTC 02:00 martes = Managua 8 PM lunes: cerrado', estadoAbierto(semana('08:00', '18:00'), Date.UTC(2026, 9, 6, 2, 0)).abierto, false);
// cruza la medianoche: 6 PM a 2 AM
const noche = semana('18:00', '02:00');
eq('noche: 23:00 abierto', estadoAbierto(noche, managua(2026, 10, 5, 23, 0)), { abierto: true, texto: 'Abierto ahora · cierra 2:00 AM' });
eq('noche: 01:00 del día siguiente sigue abierto', estadoAbierto(noche, managua(2026, 10, 6, 1, 0)).abierto, true);
eq('noche: 02:00 ya cerró', estadoAbierto(noche, managua(2026, 10, 6, 2, 0)).abierto, false);
eq('noche: 15:00 cerrado, abre hoy 6 PM', estadoAbierto(noche, managua(2026, 10, 6, 15, 0)), { abierto: false, texto: 'Cerrado · abre hoy 6:00 PM' });
// el lunes cruza a martes, pero el martes está cerrado: la 1 AM del martes sigue abierta por el lunes
const soloLunesNoche = [fila(1, '18:00', '02:00'), fila(2, null, null, true), ...[0, 3, 4, 5, 6].map((d) => fila(d, null, null, true))];
eq('1 AM del martes abierto por el tramo del lunes', estadoAbierto(soloLunesNoche, managua(2026, 10, 6, 1, 0)).abierto, true);

// --- resumen agrupado
eq('Lun a Sáb igual, Dom cerrado: el cerrado no se muestra', resumenHorarios([fila(0, null, null, true), ...[1, 2, 3, 4, 5, 6].map((d) => fila(d, '08:00:00', '18:00:00'))]),
  [{ dias: 'Lun a Sáb', horas: '8:00 AM – 6:00 PM' }]);
eq('siete días iguales', resumenHorarios(semana('08:00', '18:00')), [{ dias: 'Lun a Dom', horas: '8:00 AM – 6:00 PM' }]);
eq('lunes a viernes y sábado distinto (un día solo con nombre completo)', resumenHorarios([1, 2, 3, 4, 5].map((d) => fila(d, '08:00', '18:00')).concat([fila(6, '09:00', '13:00'), fila(0, null, null, true)])),
  [{ dias: 'Lun a Vie', horas: '8:00 AM – 6:00 PM' }, { dias: 'Sábado', horas: '9:00 AM – 1:00 PM' }]);
eq('un día cerrado en medio corta el grupo', resumenHorarios([fila(1, '08:00', '18:00'), fila(2, '08:00', '18:00'), fila(3, null, null, true), fila(4, '08:00', '18:00'), fila(5, '08:00', '18:00')]),
  [{ dias: 'Lun a Mar', horas: '8:00 AM – 6:00 PM' }, { dias: 'Jue a Vie', horas: '8:00 AM – 6:00 PM' }]);
eq('días sueltos con el mismo horario no se unen', resumenHorarios([fila(1, '08:00', '12:00'), fila(2, null, null, true), fila(3, '08:00', '12:00')]),
  [{ dias: 'Lunes', horas: '8:00 AM – 12:00 PM' }, { dias: 'Miércoles', horas: '8:00 AM – 12:00 PM' }]);
eq('sábado y domingo iguales se unen (la semana va de lunes a domingo)', resumenHorarios([fila(6, '09:00', '13:00'), fila(0, '09:00', '13:00')]), [{ dias: 'Sáb a Dom', horas: '9:00 AM – 1:00 PM' }]);
eq('todo cerrado: no hay filas', resumenHorarios([0, 1, 2, 3, 4, 5, 6].map((d) => fila(d, null, null, true))), []);
eq('sin horarios: no hay filas', resumenHorarios([]), []);
eq('las filas sin horas se ignoran', resumenHorarios([fila(1, null, null, false)]), []);
eq('hora con minutos', resumenHorarios([fila(1, '07:30', '19:45')]), [{ dias: 'Lunes', horas: '7:30 AM – 7:45 PM' }]);

// --- cómo llegar
eq('enlace de Google Maps con las coordenadas', enlaceComoLlegar(12.4355375908998, -86.8805694580078), 'https://www.google.com/maps/dir/?api=1&destination=12.4355375908998,-86.8805694580078');
eq('coordenadas como texto (la base puede devolver texto)', enlaceComoLlegar('12.4355', '-86.8805'), 'https://www.google.com/maps/dir/?api=1&destination=12.4355,-86.8805');
eq('sin coordenadas: null', enlaceComoLlegar(null, null), null);
eq('sin una coordenada: null', enlaceComoLlegar(12.4, undefined), null);
eq('texto raro: null', enlaceComoLlegar('abc', '1'), null);
eq('fuera de rango: null', enlaceComoLlegar(120, 10), null);
eq('cero es una coordenada válida (no es "falta")', enlaceComoLlegar(0, 0), 'https://www.google.com/maps/dir/?api=1&destination=0,0');
eq('la ubicación es una sección posible', SECCIONES.map((x) => x.id), ['horarios', 'productos', 'fotos', 'actividades', 'resenas', 'ubicacion']);
eq('por defecto las seis secciones están visibles', DISENO_POR_DEFECTO.secciones, ['horarios', 'productos', 'fotos', 'actividades', 'resenas', 'ubicacion']);
eq('config con ubicación primero se respeta', disenoDesdeConfig({ secciones_visibles: ['ubicacion', 'horarios'] }).secciones, ['ubicacion', 'horarios']);
eq('sección desconocida se descarta', disenoDesdeConfig({ secciones_visibles: ['mapa', 'ubicacion'] }).secciones, ['ubicacion']);

// --- fotos del negocio (utils/fotos.js)
const f = (name, type, size = 1000) => ({ name, type, size });
eq('límite de fotos = 10', MAX_FOTOS, 10);
eq('acepta solo jpg, png y webp', ACEPTA_FOTOS, 'image/jpeg,image/png,image/webp');
eq('jpg normal pasa', motivoDeRechazo(f('a.jpg', 'image/jpeg'), 0), null);
eq('png pasa', motivoDeRechazo(f('a.png', 'image/png'), 5), null);
eq('webp pasa', motivoDeRechazo(f('a.webp', 'image/webp'), 9), null);
eq('exactamente 10 MB pasa', motivoDeRechazo(f('a.jpg', 'image/jpeg', 10 * 1024 * 1024), 0), null);
eq('10 MB + 1 byte se rechaza', motivoDeRechazo(f('a.jpg', 'image/jpeg', 10 * 1024 * 1024 + 1), 0), '"a.jpg" pesa más de 10 MB. Prueba con una foto más liviana.');
eq('GIF se rechaza', motivoDeRechazo(f('a.gif', 'image/gif'), 0), '"a.gif" no es JPG, PNG ni WebP.');
eq('HEIC se rechaza', motivoDeRechazo(f('a.heic', 'image/heic'), 0), '"a.heic" no es JPG, PNG ni WebP.');
eq('con 10 fotos ya no entra otra', motivoDeRechazo(f('a.jpg', 'image/jpeg'), 10), 'Ya tienes 10 fotos. Quita alguna para subir otra.');
eq('ruta: usuario/fotos/negocio_timestamp.ext', rutaDeFoto('u-1', 7, f('x.png', 'image/png'), 1791329876738), 'u-1/fotos/7_1791329876738.png');
eq('ruta usa la extensión del tipo, no del nombre', rutaDeFoto('u-1', 7, f('x.exe', 'image/jpeg'), 5), 'u-1/fotos/7_5.jpg');
eq('ruta desde la URL pública', rutaFotoDeUrl('https://spybqychnydgvidwjrlh.supabase.co/storage/v1/object/public/negocios/u-1/fotos/7_5.jpg?t=1'), 'u-1/fotos/7_5.jpg');
eq('mover 0 -> 2', moverElemento([1, 2, 3, 4], 0, 2), [2, 3, 1, 4]);
eq('mover 3 -> 0', moverElemento([1, 2, 3, 4], 3, 0), [4, 1, 2, 3]);
eq('mover al mismo lugar no cambia', moverElemento([1, 2, 3], 1, 1), [1, 2, 3]);
eq('mover fuera de rango no cambia', moverElemento([1, 2, 3], 0, 9), [1, 2, 3]);

console.log(`${ok} de ${ok + mal} comprobaciones correctas${mal ? ` (${mal} FALLAN)` : ''}`);
process.exit(mal ? 1 : 0);
