import './BottomNav.css';
import iconoInicio from '../assets/icons/icono_inicio.svg';
import iconoPasaporte from '../assets/icons/icono_pasaporte.svg';
import iconoEventos from '../assets/icons/icono_eventos.svg';
import iconoCabezon from '../assets/icons/icono_cabezon.svg';
import iconoGigantona from '../assets/icons/icono_gigantona.svg';
import iconoUbicacion from '../assets/icons/icono_ubicacion.svg';

const ITEMS = [
  { id: 'inicio', label: 'INICIO', icon: iconoInicio },
  { id: 'pasaporte', label: 'PASAPORTE', icon: iconoPasaporte },
  { id: 'eventos', label: 'EVENTOS', icon: iconoEventos },
];

// El cuarto ítem es el avatar elegido (cabezón o gigantona); lleva a la pantalla de personalización. Perfil se abre desde
// el botón de la esquina superior derecha de Inicio, así que estando en Perfil ningún ítem queda resaltado.
function itemAvatar() {
  const icono = localStorage.getItem('avatarElegido') === 'gigantona' ? iconoGigantona : iconoCabezon;
  return { id: 'personalizacion', label: 'AVATAR', icon: icono };
}

function BottomNav({ activo, onNavigate }) {
  const ocultarFab = activo === 'mapa';
  const items = [...ITEMS, itemAvatar()];
  return (
    <>
      <nav className="bottom-nav" aria-label="Navegación principal">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`bottom-nav-item ${activo === item.id ? 'activo' : ''}`}
            onClick={() => onNavigate?.(item.id)}
            aria-current={activo === item.id ? 'page' : undefined}
            aria-label={item.label}
          >
            <img src={item.icon} alt="" />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
      {!ocultarFab && (
        <button
          type="button"
          className="bottom-nav-fab"
          onClick={() => onNavigate?.('mapa')}
          aria-label="Abrir mapa"
        >
          <img src={iconoUbicacion} alt="" />
        </button>
      )}
    </>
  );
}

export default BottomNav;
