import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

// Datos de ejemplo - Ruta Dariana (puedes agregar más)
const sitios = [
  { id: 1, name: "Catedral de León", position: [12.4375, -86.8783], desc: "Joyero de la arquitectura colonial" },
  { id: 2, name: "Ruinas de León Viejo", position: [12.4000, -86.9000], desc: "Patrimonio UNESCO" },
  { id: 3, name: "Casa de la Cultura", position: [12.4350, -86.8800], desc: "Centro cultural" },
];

function App() {
  useEffect(() => {
    // Fix para íconos de Leaflet
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
      iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    });
  }, []);

  return (
    <div style={{ height: '100vh', width: '100%' }}>
      <h1 style={{ textAlign: 'center', padding: '10px', background: '#d32f2f', color: 'white', margin: 0 }}>
        🌍 Wheregüense - Ruta Dariana
      </h1>
      
      <MapContainer 
        center={[12.4375, -86.8783]} 
        zoom={13} 
        style={{ height: 'calc(100vh - 60px)', width: '100%' }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; OpenStreetMap contributors'
        />
        
        {sitios.map(sitio => (
          <Marker key={sitio.id} position={sitio.position}>
            <Popup>
              <b>{sitio.name}</b><br />
              {sitio.desc}
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}

export default App;