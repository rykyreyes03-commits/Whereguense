import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

function EnfocarSitio({ sitios, sitioEnfocadoId, markerRefs }) {
  const map = useMap();

  useEffect(() => {
    if (!sitioEnfocadoId) return;
    const sitio = sitios.find(s => s.id === sitioEnfocadoId);
    if (!sitio) return;

    map.flyTo(sitio.position, 17);
    markerRefs.current[sitio.id]?.openPopup();
  }, [sitioEnfocadoId]);

  return null;
}

function MapaRuta({ sitios, onSellar, sitioEnfocadoId }) {
  const markerRefs = useRef({});

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
      <EnfocarSitio sitios={sitios} sitioEnfocadoId={sitioEnfocadoId} markerRefs={markerRefs} />
      {sitios.map(sitio => (
        <Marker
          key={sitio.id}
          position={sitio.position}
          ref={(ref) => {
            if (ref) markerRefs.current[sitio.id] = ref;
          }}
        >
          <Popup>
            <h3>{sitio.name}</h3>
            <p><strong>{sitio.desc}</strong></p>
            {sitio.historia && <p>{sitio.historia}</p>}
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
