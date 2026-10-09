import { User } from 'lucide-react';
import { useTranslation } from 'react-i18next';

// Botón redondo con el ícono de usuario para la esquina superior derecha de una TopBar (rightSlot): abre el Perfil.
function BotonPerfil({ onClick }) {
  const { t } = useTranslation();
  return (
    <button type="button" className="topbar-perfil-btn" onClick={onClick} aria-label={t('inicio.perfil')}>
      <User size={22} strokeWidth={2.2} aria-hidden="true" />
    </button>
  );
}

export default BotonPerfil;
