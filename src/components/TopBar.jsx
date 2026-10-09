import { useTranslation } from 'react-i18next';
import './TopBar.css';
import iconoMenu from '../assets/icons/icono_menu.svg';
import logoWheregueense from '../assets/logo_wheregueense.png';

function TopBar({ title, onBack, onMenuClick, rightSlot, align = 'left', children }) {
  const { t } = useTranslation();
  return (
    <header className={`topbar topbar-${align}`}>
      <div className="topbar-fila">
        {onBack ? (
          <button className="topbar-volver" onClick={onBack} aria-label={t('comun.volverAria')}>
            {t('comun.volver')}
          </button>
        ) : (
          <button className="topbar-menu" onClick={onMenuClick} aria-label={t('comun.menu')}>
            <img src={iconoMenu} alt={t('comun.menu')} />
          </button>
        )}
        {!title && <img src={logoWheregueense} alt="WhereGüense" className="topbar-logo" />}
        {rightSlot}
      </div>
      {title && <h1 className="topbar-titulo">{title}</h1>}
      {children}
    </header>
  );
}

export default TopBar;