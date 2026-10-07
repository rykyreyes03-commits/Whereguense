import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './SeleccionUbicacion.css';

const iconoYo = L.divIcon({
  className: 'ubicacion-yo-icono',
  html: '<span class="ubicacion-yo-halo"></span><span class="ubicacion-yo-punto"></span>',
  iconSize: [44, 44],
  iconAnchor: [22, 22],
});

function ClicMapa({ onClic }) {
  useMapEvents({
    click(e) {
      onClic({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

function SeguirMapa({ posicion, centrar }) {
  const map = useMap();
  useEffect(() => {
    if (posicion && centrar) {
      map.setView([posicion.lat, posicion.lng], Math.max(map.getZoom(), 17));
    }
  }, [posicion, centrar, map]);
  return null;
}

function SeleccionUbicacion({ ubicacionInicial, onConfirmar, onCancelar }) {
  const [punto, setPunto] = useState(ubicacionInicial || null);
  const [siguiendo, setSiguiendo] = useState(false);
  const [yo, setYo] = useState(null);
  const [aviso, setAviso] = useState('');

  useEffect(() => {
    if (!siguiendo) return undefined;
    if (!navigator.geolocation) {
      setAviso('Tu navegador no permite obtener la ubicación.');
      setSiguiendo(false);
      return undefined;
    }
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        const p = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setAviso('');
        setYo(p);
        setPunto(p);
      },
      () => {
        setAviso('Activa la ubicación en tu navegador para usar esta opción.');
        setSiguiendo(false);
      },
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 15000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [siguiendo]);

  const marcarManual = (p) => {
    setSiguiendo(false);
    setPunto(p);
  };

  return (
    <div className="ubicacion-wrapper">
      <div className="ubicacion-topbar">
        <button className="ubicacion-cancelar" onClick={onCancelar} type="button">← Cancelar</button>
        <h2 className="ubicacion-titulo">Marca la ubicación de tu negocio</h2>
      </div>

      <div className="ubicacion-mapa">
        <MapContainer
          center={punto ? [punto.lat, punto.lng] : [12.4375, -86.8783]}
          zoom={15}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; OpenStreetMap contributors'
          />
          {yo && <Marker position={[yo.lat, yo.lng]} icon={iconoYo} interactive={false} keyboard={false} />}
          {punto && !siguiendo && <Marker position={[punto.lat, punto.lng]} />}
          <SeguirMapa posicion={yo} centrar={siguiendo} />
          <ClicMapa onClic={marcarManual} />
        </MapContainer>
      </div>

      <div className="ubicacion-footer">
        <button
          className={`ubicacion-tiempo-real${siguiendo ? ' ubicacion-tiempo-real--activo' : ''}`}
          onClick={() => setSiguiendo((s) => !s)}
          aria-pressed={siguiendo}
          type="button"
        >
          {siguiendo ? 'Dejar de seguir mi ubicación' : 'Usar mi ubicación en tiempo real'}
        </button>
        <p className="ubicacion-ayuda" role="status">
          {aviso
            || (siguiendo && !yo && 'Buscando tu ubicación…')
            || (siguiendo && 'Tu ubicación se actualiza sola. Toca "Confirmar ubicación" cuando estés en tu negocio.')
            || (punto
              ? 'Toca "Confirmar ubicación" o vuelve a tocar el mapa para ajustar el punto.'
              : 'Toca el mapa en el punto donde está tu negocio.')}
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
