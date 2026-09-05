// Traducción del personaje base entre el valor que usa el frontend y el que
// acepta la columna `usuario.avatar_personaje` en Supabase.
//
//   frontend (SeleccionDanzante, Perfil, Personalizacion, localStorage): 'enano' | 'gigantona'
//   base de datos (CHECK avatar_personaje in ('cabezon','gigantona')):    'cabezon' | 'gigantona'
//
// El resto del código sigue trabajando con 'enano'. Esta capa solo traduce en
// el borde: al escribir en la tabla `usuario` y al hidratar el localStorage
// desde la fila del usuario. Ver App.jsx (handleElegirDanzante y el efecto de
// resolución de sesión).

export function aPersonajeDB(valorLocal) {
  return valorLocal === 'gigantona' ? 'gigantona' : 'cabezon';
}

export function aPersonajeLocal(valorDB) {
  return valorDB === 'gigantona' ? 'gigantona' : 'enano';
}
