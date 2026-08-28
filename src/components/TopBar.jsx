import './TopBar.css';
import iconoMenu from '../assets/icons/icono_menu.svg';

function TopBar({ title, onBack, onMenuClick, rightSlot, align = 'left', children }) {
  return (
    <header className={`topbar topbar-${align}`}>
      <div className="topbar-fila">
        {onBack ? (
          <button className="topbar-volver" onClick={onBack} aria-label="Volver">
            ← Volver
          </button>
        ) : (
          <button className="topbar-menu" onClick={onMenuClick} aria-label="Menú">
            <img src={iconoMenu} alt="Menú" />
          </button>
        )}
        {rightSlot}
      </div>
      {title && <h1 className="topbar-titulo">{title}</h1>}
      {children}
    </header>
  );
}

export default TopBar;