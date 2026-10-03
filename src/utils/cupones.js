function formatearFecha(iso) {
  return new Date(iso).toLocaleDateString('es-NI', { day: 'numeric', month: 'short', year: 'numeric' });
}

// Etiqueta del estado de un cupón del turista (lo que calcula mis_cupones_obtenidos, 027).
// clave: 'disponible' | 'usado' | 'no-disponible' (vencido o negocio sin suscripción vigente).
export function estadoCupon(cupon) {
  if (cupon.estado === 'usado') return { clave: 'usado', texto: `Usado el ${formatearFecha(cupon.fecha_uso)}` };
  if (cupon.disponible) return { clave: 'disponible', texto: 'Disponible' };
  const vencido = cupon.fecha_expiracion && new Date(cupon.fecha_expiracion) < new Date();
  return { clave: 'no-disponible', texto: vencido ? 'Venció' : 'No disponible' };
}
