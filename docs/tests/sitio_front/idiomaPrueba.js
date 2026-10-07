// Fija el idioma de la app para las pruebas: español salvo que la página pida otro con ?lang=en.
// Debe importarse ANTES de '/src/i18n.js' (el detector lee localStorage al iniciar).
const pedido = new URLSearchParams(window.location.search).get('lang');
try { localStorage.setItem('idioma', pedido || 'es'); } catch { /* sin almacenamiento: se queda el idioma del navegador */ }
