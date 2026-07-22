import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

function MapaRuta({ sitios, onSellar }) {
  return (
    <MapContainer 
      center={[12.4375, -86.8783]} 
      zoom={13.5} 
      style={{ height: 'calc(100vh - 70px)', width: '100%' }}
    >
      <TileLayer 
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" 
        attribution='&copy; OpenStreetMap contributors' 
      />
      {sitios.map(sitio => (
        <Marker key={sitio.id} position={sitio.position}>
          <Popup>
            <h3>{sitio.name}</h3>
            <p>{sitio.desc}</p>
            <button 
              onClick={() => onSellar(sitio)} 
              style={{ 
                padding: '10px 15px', 
                background: '#4caf50', 
                color: 'white', 
                border: 'none', 
                borderRadius: '4px', 
                cursor: 'pointer', 
                width: '100%' 
              }}
            >
              Sellar Pasaporte
            </button>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}

export default MapaRuta;