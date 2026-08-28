import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './MapaRuta.css';
import { useUbicacionActual } from '../hooks/useUbicacionActual';
import { calcularDistanciaMetros } from '../utils/geo';

const RADIO_GEOFENCE_METROS = 80;

const iconoUbicacion = L.divIcon({
  className: 'ubicacion-usuario-icono',
  html: '<div class="ubicacion-usuario-punto"></div>',
  iconSize: [18, 18],
});

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

function MapaRuta({ sitios, onSellar, onSellarAutomatico, sitioEnfocadoId }) {
  const markerRefs = useRef({});
  const mapRef = useRef(null);
  const { ubicacion, error } = useUbicacionActual();

  useEffect(() => {
    if (!ubicacion) return;

    sitios.forEach((sitio) => {
      const distancia = calcularDistanciaMetros(
        ubicacion.lat,
        ubicacion.lng,
        sitio.position[0],
        sitio.position[1]
      );
      if (distancia <= RADIO_GEOFENCE_METROS) {
        onSellarAutomatico?.(sitio);
      }
    });
  }, [ubicacion, sitios, onSellarAutomatico]);

  const centrarEnMiUbicacion = () => {
    if (ubicacion && mapRef.current) {
      mapRef.current.flyTo([ubicacion.lat, ubicacion.lng], 16);
    }
  };

  return (
    <div className="mapa-ruta-wrapper">
      <MapContainer
        ref={mapRef}
        center={[12.4375, -86.8783]}
        zoom={13.5}
        style={{ flex: 1, width: '100%' }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; OpenStreetMap contributors'
        />
        {sitios.map(sitio => (
          <Circle
            key={`radio-${sitio.id}`}
            center={sitio.position}
            radius={RADIO_GEOFENCE_METROS}
            pathOptions={{ color: '#1a73e8', weight: 1, fillOpacity: 0.08 }}
          />
        ))}

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
              <button className="mapa-popup-sellar-btn" onClick={() => onSellar(sitio)}>
                Sellar Pasaporte
              </button>
            </Popup>
          </Marker>
        ))}

        {ubicacion && (
          <Marker position={[ubicacion.lat, ubicacion.lng]} icon={iconoUbicacion} zIndexOffset={1000} />
        )}

        <EnfocarSitio sitios={sitios} sitioEnfocadoId={sitioEnfocadoId} markerRefs={markerRefs} />
      </MapContainer>

      <button
        className="mapa-mi-ubicacion-btn"
        onClick={centrarEnMiUbicacion}
        disabled={!ubicacion}
        aria-label="Centrar en mi ubicación"
        type="button"
      >
        📍
      </button>

      {error && <p className="mapa-ubicacion-error">{error}</p>}
    </div>
  );
}

export default MapaRuta;
