// Pantallas y ventanas que se abren una encima de otra (detalle -> QR, formulario -> "¿Salir sin guardar?").
// Solo la de arriba recibe teclado y foco: al abrir una nueva, la que quedó debajo se vuelve inerte, y la página de
// fondo también. Al cerrarla, la de abajo (o la página) vuelve a estar activa. PantallaFormulario y
// DialogoConfirmacion usan esta misma pila.
const pila = [];
let overflowOriginal = '';

// Registra una pantalla recién montada. Devuelve la función que la quita al cerrarla.
export function apilar(elemento) {
  const fondo = document.getElementById('root');
  const debajo = pila[pila.length - 1];
  if (debajo) debajo.inert = true;
  pila.push(elemento);
  if (fondo) fondo.inert = true;
  // El bloqueo del desplazamiento de la página lo lleva la pila (no cada pantalla): se quita solo al cerrar la última,
  // sin importar en qué orden se cierren.
  if (pila.length === 1) {
    overflowOriginal = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  }

  return () => {
    const i = pila.indexOf(elemento);
    if (i >= 0) pila.splice(i, 1);
    const tope = pila[pila.length - 1];
    if (tope) {
      tope.inert = false;
    } else {
      if (fondo) fondo.inert = false;
      document.body.style.overflow = overflowOriginal;
    }
  };
}

export function esTope(elemento) {
  return pila[pila.length - 1] === elemento;
}
