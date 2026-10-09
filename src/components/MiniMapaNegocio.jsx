import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './MiniMapaNegocio.css';

// Pin del negocio: del color de la paleta de la ficha (--ficha-color).
const iconoNegocio = L.divIcon({
  className: 'minimapa-pin',
  html: '<span></span>',
  iconSize: [30, 38],
  iconAnchor: [15, 36],
});

// Mini-mapa de la ficha: centrado en el negocio, zoom 15, con un marcador. Es una vista fija (no se arrastra ni se hace zoom)
// para que el dedo siga desplazando la página; para ir hasta allá está el botón "Cómo llegar".
function MiniMapaNegocio({ lat, lng, nombre }) {
  return (
    <div className="minimapa" role="img" aria-label={`Mapa con la ubicación de ${nombre || 'el negocio'}`}>
      <MapContainer
        center={[lat, lng]}
        zoom={15}
        zoomControl={false}
        dragging={false}
        scrollWheelZoom={false}
        doubleClickZoom={false}
        touchZoom={false}
        boxZoom={false}
        keyboard={false}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          url={`https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?key=${import.meta.env.VITE_CARTO_API_KEY}`}
          attribution='&copy; OpenStreetMap contributors &copy; CARTO'
        />
        <Marker position={[lat, lng]} icon={iconoNegocio} interactive={false} keyboard={false} />
      </MapContainer>
    </div>
  );
}

export default MiniMapaNegocio;
