import { Fragment, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Sun, Moon } from 'lucide-react';
import { cambiarIdioma } from '../i18n';
import { cambiarTema, temaGuardado } from '../tema';
import './Menu.css';
import TopBar from './TopBar';

const IconoCupon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden="true">
    <path d="M4 8.5A1.5 1.5 0 0 1 5.5 7h13A1.5 1.5 0 0 1 20 8.5V10a2 2 0 0 0 0 4v1.5a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 15.5V14a2 2 0 0 0 0-4V8.5Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    <path d="M14 7.5v9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeDasharray="1.6 2.2" />
  </svg>
);
const IconoIdioma = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden="true">
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
    <path d="M3 12h18M12 3c2.5 2.7 2.5 15.3 0 18M12 3c-2.5 2.7-2.5 15.3 0 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);
const IconoNotificaciones = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden="true">
    <path d="M6 16V11a6 6 0 1 1 12 0v5l1.8 2.4a.6.6 0 0 1-.48.96H4.68a.6.6 0 0 1-.48-.96L6 16Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    <path d="M10 20a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);
const IconoTema = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden="true">
    <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.8" />
    <path d="M12 4a8 8 0 0 0 0 16Z" fill="currentColor" />
  </svg>
);
const IconoPrivacidad = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden="true">
    <path d="M12 3l7 3v5c0 4.4-2.9 8.3-7 9.5C7.9 19.3 5 15.4 5 11V6l7-3Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    <path d="M9.2 12l2 2 3.6-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const IconoAyuda = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden="true">
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
    <path d="M9.5 9.5a2.5 2.5 0 0 1 4.5 1.5c0 1.7-2 2-2 3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    <circle cx="12" cy="17.5" r="1" fill="currentColor" />
  </svg>
);
const IconoAcerca = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden="true">
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
    <path d="M12 11v6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    <circle cx="12" cy="7.5" r="1" fill="currentColor" />
  </svg>
);

const IconoQR = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden="true">
    <path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    <rect x="8.5" y="8.5" width="3" height="3" rx="0.6" fill="currentColor" />
    <rect x="12.5" y="8.5" width="3" height="3" rx="0.6" fill="currentColor" />
    <rect x="8.5" y="12.5" width="3" height="3" rx="0.6" fill="currentColor" />
    <rect x="13" y="13" width="2" height="2" rx="0.5" fill="currentColor" />
  </svg>
);

const IconoNegocio = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden="true">
    <path d="M4 10l1-5h14l1 5M4 10v9a1 1 0 0 0 1 1h4v-6h6v6h4a1 1 0 0 0 1-1v-9M4 10h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const Chevron = () => (
  <svg className="menu-chevron" viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
    <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const IconoAdmin = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden="true">
    <rect x="3" y="3" width="7" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
    <rect x="14" y="3" width="7" height="5" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
    <rect x="14" y="12" width="7" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
    <rect x="3" y="16" width="7" height="5" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
  </svg>
);

// Qué opciones ve cada quien. El menú del emprendedor (se abre desde su panel) no trae las funciones del turista
// (escanear sello y cupón) ni "Mi negocio", que ya es una pestaña de su barra. "Panel Admin" solo lo ve un admin.
function opcionesMenu(esAdmin, modoNegocio) {
  const deTurista = [
    { clave: 'escanearSello', Icono: IconoQR, pantalla: 'escanearQR' },
    { clave: 'escanearCupon', Icono: IconoCupon, pantalla: 'escanearCupon' },
    { clave: 'misCupones', Icono: IconoCupon, pantalla: 'misCupones' },
    { clave: 'miNegocio', Icono: IconoNegocio, accion: 'miNegocio' },
  ];
  const comunes = [
    { clave: 'idioma', Icono: IconoIdioma, accion: 'idioma' },
    { clave: 'notificaciones', Icono: IconoNotificaciones },
    { clave: 'tema', Icono: IconoTema, accion: 'tema' },
    { clave: 'privacidad', Icono: IconoPrivacidad },
    { clave: 'ayuda', Icono: IconoAyuda },
    { clave: 'acerca', Icono: IconoAcerca },
  ];
  const lista = modoNegocio ? comunes : [...deTurista, ...comunes];
  if (esAdmin) lista.unshift({ clave: 'panelAdmin', Icono: IconoAdmin, pantalla: 'panelAdmin' });
  return lista;
}

const IDIOMAS = [
  { id: 'es', nombre: 'Español' },
  { id: 'en', nombre: 'English' },
];

const TEMAS_MENU = [
  { id: 'claro', Icono: Sun, clave: 'temaClaro' },
  { id: 'oscuro', Icono: Moon, clave: 'temaOscuro' },
];

function Menu({ onNavigate, onVolver, onCerrarSesion, onMiNegocio, onCambiarIdioma, esAdmin, modoNegocio = false }) {
  const { t, i18n } = useTranslation();
  const [abierto, setAbierto] = useState(null); // selector desplegado: 'idioma', 'tema' o ninguno
  const [temaActual, setTemaActual] = useState(temaGuardado);
  const idiomaActual = String(i18n.language || 'es').slice(0, 2) === 'en' ? 'en' : 'es';
  const OPCIONES = opcionesMenu(esAdmin, modoNegocio);

  const handleOpcion = (clave) => {
    window.alert(t('menu.proximamente', { opcion: t(`menu.${clave}`) }));
  };

  const elegirIdioma = (id) => {
    // La app guarda la preferencia en la cuenta; sin ese manejador (pruebas) solo cambia en este dispositivo.
    (onCambiarIdioma || cambiarIdioma)(id);
  };

  const elegirTema = (id) => {
    cambiarTema(id); // se aplica ya (clase "dark" en <html>) y queda guardado en localStorage
    setTemaActual(id);
  };

  const handleCerrarSesion = () => {
    const confirmado = window.confirm(t('perfil.confirmarCerrar'));
    if (!confirmado) return;

    onCerrarSesion?.();
  };

  return (
    <div className="menu-wrapper">
      <TopBar title={t('menu.titulo')} onBack={onVolver} />

      <div className="menu-contenido">
        <nav className="menu-lista">
          {OPCIONES.map(({ clave, Icono, pantalla, accion }) => {
            const desplegable = accion === 'idioma' || accion === 'tema';
            return (
              <Fragment key={clave}>
                <button
                  className="menu-item"
                  aria-expanded={desplegable ? abierto === accion : undefined}
                  onClick={() => {
                    if (desplegable) {
                      setAbierto((actual) => (actual === accion ? null : accion));
                    } else if (accion === 'miNegocio') {
                      onMiNegocio?.();
                    } else if (pantalla) {
                      onNavigate?.(pantalla);
                    } else {
                      handleOpcion(clave);
                    }
                  }}
                >
                  <span className="menu-item-icono"><Icono /></span>
                  <span className="menu-item-texto">{t(`menu.${clave}`)}</span>
                  <Chevron />
                </button>
                {accion === 'idioma' && abierto === 'idioma' && (
                  <div className="menu-selector" role="radiogroup" aria-label={t('menu.idioma')}>
                    {IDIOMAS.map(({ id, nombre }) => (
                      <button
                        key={id}
                        type="button"
                        role="radio"
                        aria-checked={idiomaActual === id}
                        className="menu-selector-opcion"
                        onClick={() => elegirIdioma(id)}
                      >
                        {nombre}
                      </button>
                    ))}
                  </div>
                )}
                {accion === 'tema' && abierto === 'tema' && (
                  <div className="menu-selector" role="radiogroup" aria-label={t('menu.tema')}>
                    {TEMAS_MENU.map(({ id, Icono: IconoTemaOpcion, clave: claveTema }) => (
                      <button
                        key={id}
                        type="button"
                        role="radio"
                        aria-checked={temaActual === id}
                        className="menu-selector-opcion"
                        onClick={() => elegirTema(id)}
                      >
                        <IconoTemaOpcion size={18} strokeWidth={2} aria-hidden="true" />
                        {t(`menu.${claveTema}`)}
                      </button>
                    ))}
                  </div>
                )}
              </Fragment>
            );
          })}
        </nav>

        <div className="menu-sesion">
          <button className="menu-logout-btn" onClick={handleCerrarSesion}>
            {t('perfil.cerrarSesion')}
          </button>
        </div>
      </div>
    </div>
  );
}

export default Menu;
