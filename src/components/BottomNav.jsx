import './BottomNav.css';
import iconoInicio from '../assets/icons/icono_inicio.svg';
import iconoPasaporte from '../assets/icons/icono_pasaporte.svg';
import iconoEventos from '../assets/icons/icono_eventos.svg';
import iconoPerfil from '../assets/icons/icono_perfil.svg';
import iconoUbicacion from '../assets/icons/icono_ubicacion.svg';

const ITEMS = [
  { id: 'inicio', label: 'INICIO', icon: iconoInicio },
  { id: 'pasaporte', label: 'PASAPORTE', icon: iconoPasaporte },
  { id: 'eventos', label: 'EVENTOS', icon: iconoEventos },
  { id: 'perfil', label: 'PERFIL', icon: iconoPerfil },
];

function BottomNav({ activo, onNavigate }) {
  const ocultarFab = activo === 'mapa';
  return (
    <>
      <nav className="bottom-nav" aria-label="Navegación principal">
        {ITEMS.map((item) => (
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
