import './BottomNav.css';
import iconoInicio from '../assets/icons/icono_inicio.svg';
import iconoPasaporte from '../assets/icons/icono_pasaporte.svg';
import iconoUbicacion from '../assets/icons/icono_ubicacion.svg';
import iconoEventos from '../assets/icons/icono_eventos.svg';
import iconoPerfil from '../assets/icons/icono_perfil.svg';

const ITEMS = [
  { id: 'inicio', label: 'INICIO', icon: iconoInicio },
  { id: 'pasaporte', label: 'PASAPORTE', icon: iconoPasaporte },
  { id: 'mapa', label: 'MAPA', icon: iconoUbicacion },
  { id: 'eventos', label: 'EVENTOS', icon: iconoEventos },
  { id: 'perfil', label: 'PERFIL', icon: iconoPerfil },
];

function BottomNav({ activo, onNavigate }) {
  return (
    <nav className="bottom-nav">
      {ITEMS.map((item) => (
        <button
          key={item.id}
          className={`bottom-nav-item ${activo === item.id ? 'activo' : ''}`}
          onClick={() => onNavigate?.(item.id)}
        >
          <img src={item.icon} alt="" />
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  );
}

export default BottomNav;