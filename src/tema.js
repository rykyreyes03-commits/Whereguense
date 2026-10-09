// Tema claro / oscuro de la app. La preferencia vive en localStorage (clave 'tema': 'claro' | 'oscuro'); sin preferencia
// guardada la app es clara, como siempre. El tema oscuro es la clase "dark" en <html>: los colores salen de las variables
// de src/tema.css. El script de index.html pone esa clase antes de dibujar, para que no haya un parpadeo claro al abrir.
export const CLAVE_TEMA = 'tema';
export const TEMAS = ['claro', 'oscuro'];

export function temaGuardado() {
  try {
    const guardado = localStorage.getItem(CLAVE_TEMA);
    return TEMAS.includes(guardado) ? guardado : 'claro';
  } catch {
    return 'claro'; // sin almacenamiento (modo privado, datos bloqueados): se queda el tema claro
  }
}

export function aplicarTema(tema) {
  document.documentElement.classList.toggle('dark', tema === 'oscuro');
}

// Cambia el tema ahora mismo y lo recuerda. Ignora cualquier valor que no sea 'claro' u 'oscuro'.
export function cambiarTema(tema) {
  if (!TEMAS.includes(tema)) return;
  try {
    localStorage.setItem(CLAVE_TEMA, tema);
  } catch {
    // no se pudo guardar: el cambio vale para esta sesión
  }
  aplicarTema(tema);
}
