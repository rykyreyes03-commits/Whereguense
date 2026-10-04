import { LayoutDashboard, Store, QrCode, Star, Palette } from 'lucide-react';
import './BottomNavNegocio.css';

// Barra inferior fija del panel del emprendedor. Mismo estilo que BottomNav (la del
// turista), pero con 5 ítems con ícono Lucide y sin el botón flotante del mapa:
// BottomNav tiene los ítems, las 4 columnas y los íconos SVG fijos en el código.
const ITEMS = [
  { id: 'resumen', etiqueta: 'Resumen', Icono: LayoutDashboard },
  { id: 'negocio', etiqueta: 'Mi negocio', Icono: Store },
  { id: 'actividades', etiqueta: 'Actividades', Icono: QrCode },
  { id: 'resenas', etiqueta: 'Reseñas', Icono: Star },
  { id: 'diseno', etiqueta: 'Diseño', Icono: Palette },
];

function BottomNavNegocio({ activo, onCambiar }) {
  return (
    <nav className="bottom-nav-negocio" aria-label="Secciones de tu panel">
      {ITEMS.map(({ id, etiqueta, Icono }) => (
        <button
          key={id}
          type="button"
          className={`bottom-nav-negocio-item ${activo === id ? 'activo' : ''}`}
          onClick={() => onCambiar?.(id)}
          aria-current={activo === id ? 'page' : undefined}
        >
          <Icono size={24} strokeWidth={1.8} aria-hidden="true" />
          <span>{etiqueta}</span>
        </button>
      ))}
    </nav>
  );
}

export default BottomNavNegocio;
