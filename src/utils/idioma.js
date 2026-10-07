// Idioma de la interfaz para las utilidades de formato (fechas, horas), que no usan React. i18n.js lo actualiza cada vez que
// cambia el idioma; sin eso (por ejemplo en las pruebas de Node) vale español.
let actual = 'es';

export function fijarIdioma(idioma) {
  actual = idioma === 'en' ? 'en' : 'es';
}

// i18n.js registra aquí su función t; sin ella (pruebas de Node) se devuelve el texto en español.
let traductor = null;
export function fijarTraductor(fn) {
  traductor = fn;
}
export function traducir(clave, porDefecto) {
  return traductor ? traductor(clave, { defaultValue: porDefecto }) : porDefecto;
}

export function idiomaActual() {
  return actual;
}

export function esIngles() {
  return actual === 'en';
}

// Código de región para toLocaleDateString: es-NI (como siempre) o en-US.
export function localeFechas() {
  return actual === 'en' ? 'en-US' : 'es-NI';
}
