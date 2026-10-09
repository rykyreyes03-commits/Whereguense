import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import es from './locales/es.json';
import en from './locales/en.json';
import { fijarIdioma, fijarTraductor } from './utils/idioma';

export const IDIOMAS_APP = ['es', 'en'];
export const CLAVE_IDIOMA = 'idioma';

// Español por defecto. Se detecta el idioma guardado en el dispositivo y, si no hay, el del navegador ('en-US' vale 'en',
// 'es-NI' vale 'es'; cualquier otro idioma cae en español). La preferencia queda en localStorage.
i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: { es: { translation: es }, en: { translation: en } },
    supportedLngs: IDIOMAS_APP,
    nonExplicitSupportedLngs: true,
    load: 'languageOnly',
    fallbackLng: 'es',
    interpolation: { escapeValue: false }, // React ya escapa
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: CLAVE_IDIOMA,
      caches: ['localStorage'],
    },
    returnNull: false,
  });

// Las utilidades de fechas (sin React) y el atributo lang del documento siguen al idioma activo.
function aplicarIdioma(idioma) {
  const corto = String(idioma || 'es').slice(0, 2) === 'en' ? 'en' : 'es';
  fijarIdioma(corto);
  if (typeof document !== 'undefined') document.documentElement.lang = corto === 'en' ? 'en' : 'es-NI';
}
fijarTraductor((clave, opciones) => i18n.t(clave, opciones));
aplicarIdioma(i18n.language);
i18n.on('languageChanged', aplicarIdioma);

// Cambia el idioma de la app (y lo guarda). Acepta solo 'es' o 'en'; cualquier otra cosa se ignora.
export function cambiarIdioma(idioma) {
  if (!IDIOMAS_APP.includes(idioma)) return Promise.resolve();
  if (String(i18n.language || '').slice(0, 2) === idioma) return Promise.resolve();
  return i18n.changeLanguage(idioma);
}

export default i18n;
