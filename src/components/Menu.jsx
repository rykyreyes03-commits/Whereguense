import './Menu.css';
import TopBar from './TopBar';

const OPCIONES = [
  'Cambiar idioma',
  'Notificaciones',
  'Tema',
  'Privacidad',
  'Ayuda y soporte',
  'Acerca de',
];

function Menu({ onNavigate, onVolver, onCerrarSesion }) {
  const handleOpcion = (opcion) => {
    window.alert(`${opcion}: próximamente 🚧`);
  };

    const handleCerrarSesion = () => {
    const confirmado = window.confirm('¿Seguro que quieres cerrar sesión? Se borrarán tus sellos y datos de perfil guardados en este dispositivo.');
    if (!confirmado) return;

    onCerrarSesion?.();
  };

  return (
    <div className="menu-wrapper">
      <TopBar onBack={onVolver} />

      <nav className="menu-lista">
        {OPCIONES.map((opcion) => (
          <button key={opcion} className="menu-item" onClick={() => handleOpcion(opcion)}>
            {opcion}
          </button>
        ))}
      </nav>

      <button className="menu-logout-btn" onClick={handleCerrarSesion}>
        Cerrar sesión
      </button>
    </div>
  );
}

export default Menu;