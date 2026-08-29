import { useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import './SeleccionUbicacion.css';

function ClicMapa({ onClic }) {
  useMapEvents({
    click(e) {
      onClic({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

function SeleccionUbicacion({ ubicacionInicial, onConfirmar, onCancelar }) {
  const [punto, setPunto] = useState(ubicacionInicial || null);

  return (
    <div className="ubicacion-wrapper">
      <div className="ubicacion-topbar">
        <button className="ubicacion-cancelar" onClick={onCancelar} type="button">← Cancelar</button>
        <h2 className="ubicacion-titulo">Marca la ubicación de tu negocio</h2>
      </div>

      <MapContainer
        center={punto ? [punto.lat, punto.lng] : [12.4375, -86.8783]}
        zoom={15}
        style={{ flex: 1, width: '100%' }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; OpenStreetMap contributors'
        />
        {punto && <Marker position={[punto.lat, punto.lng]} />}
        <ClicMapa onClic={setPunto} />
      </MapContainer>

      <div className="ubicacion-footer">
        <p className="ubicacion-ayuda">
          {punto
            ? 'Toca "Confirmar ubicación" o vuelve a tocar el mapa para ajustar el punto.'
            : 'Toca el mapa en el punto donde está tu negocio.'}
        </p>
        <button
          className="ubicacion-confirmar"
          disabled={!punto}
          onClick={() => onConfirmar(punto)}
          type="button"
        >
          Confirmar ubicación
        </button>
      </div>
    </div>
  );
}

export default SeleccionUbicacion;
