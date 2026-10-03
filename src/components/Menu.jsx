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

function opcionesMenu(esAdmin) {
  const base = [
    { etiqueta: 'Escanear sello QR', Icono: IconoQR, pantalla: 'escanearQR' },
    { etiqueta: 'Escanear cupón', Icono: IconoCupon, pantalla: 'escanearCupon' },
    { etiqueta: 'Mi negocio', Icono: IconoNegocio, accion: 'miNegocio' },
    { etiqueta: 'Cambiar idioma', Icono: IconoIdioma },
    { etiqueta: 'Notificaciones', Icono: IconoNotificaciones },
    { etiqueta: 'Tema', Icono: IconoTema },
    { etiqueta: 'Privacidad', Icono: IconoPrivacidad },
    { etiqueta: 'Ayuda y soporte', Icono: IconoAyuda },
    { etiqueta: 'Acerca de', Icono: IconoAcerca },
  ];
  if (esAdmin) {
    base.unshift({ etiqueta: 'Panel Admin', Icono: IconoAdmin, pantalla: 'panelAdmin' });
  }
  return base;
}

function Menu({ onNavigate, onVolver, onCerrarSesion, onMiNegocio, esAdmin }) {
  const OPCIONES = opcionesMenu(esAdmin);
  const handleOpcion = (opcion) => {
    window.alert(`${opcion}: próximamente 🚧`);
  };

  const handleCerrarSesion = () => {
    const confirmado = window.confirm(
      '¿Seguro que quieres cerrar sesión? Se borrarán tus sellos y datos de perfil guardados en este dispositivo.'
    );
    if (!confirmado) return;

    onCerrarSesion?.();
  };

  return (
    <div className="menu-wrapper">
      <TopBar title="Configuración" onBack={onVolver} />

      <div className="menu-contenido">
        <nav className="menu-lista">
          {OPCIONES.map(({ etiqueta, Icono, pantalla, accion }) => (
            <button
              key={etiqueta}
              className="menu-item"
              onClick={() => {
                if (accion === 'miNegocio') {
                  onMiNegocio?.();
                } else if (pantalla) {
                  onNavigate?.(pantalla);
                } else {
                  handleOpcion(etiqueta);
                }
              }}
            >
              <span className="menu-item-icono"><Icono /></span>
              <span className="menu-item-texto">{etiqueta}</span>
              <Chevron />
            </button>
          ))}
        </nav>

        <div className="menu-sesion">
          <button className="menu-logout-btn" onClick={handleCerrarSesion}>
            Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  );
}

export default Menu;
