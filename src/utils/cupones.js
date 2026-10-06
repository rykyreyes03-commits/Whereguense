import { cuponVencido } from './eventos';

function formatearFecha(iso) {
  return new Date(iso).toLocaleDateString('es-NI', { day: 'numeric', month: 'short', year: 'numeric' });
}

// Etiqueta del estado de un cupón del turista (lo que calcula mis_cupones_obtenidos, 027).
// clave: 'disponible' | 'usado' | 'no-disponible' (vencido o negocio sin suscripción vigente).
export function estadoCupon(cupon, ahora = Date.now()) {
  if (cupon.estado === 'usado') return { clave: 'usado', texto: `Usado el ${formatearFecha(cupon.fecha_uso)}` };
  // 'disponible' llega calculado al cargar; con el reloj se corrige si el cupón venció mientras la pantalla estaba abierta.
  const vencido = cuponVencido(cupon, ahora);
  if (cupon.disponible && !vencido) return { clave: 'disponible', texto: 'Disponible' };
  return { clave: 'no-disponible', texto: vencido ? 'Venció' : 'No disponible' };
}

// Estado de un cupón visto por su dueño, con las mismas claves y textos que ve el turista (estadoCupon):
// activo y vigente = Disponible; desactivado = No disponible; pasada su fecha = Venció.
export function estadoDeCupon(cupon) {
  const vencido = Boolean(cupon.fecha_expiracion) && new Date(cupon.fecha_expiracion) < new Date();
  if (vencido) return { clave: 'no-disponible', texto: 'Venció' };
  if (!cupon.activo) return { clave: 'no-disponible', texto: 'No disponible' };
  return { clave: 'disponible', texto: 'Disponible' };
}
