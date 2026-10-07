// Fija el idioma y el tema de la app para las pruebas: español y tema claro salvo que la página pida otro con
// ?lang=en o ?tema=oscuro. Debe importarse ANTES de '/src/i18n.js' (el detector lee localStorage al iniciar).
const params = new URLSearchParams(window.location.search);
try {
  localStorage.setItem('idioma', params.get('lang') || 'es');
  localStorage.setItem('tema', params.get('tema') || 'claro');
} catch { /* sin almacenamiento: se queda el idioma del navegador y el tema claro */ }
