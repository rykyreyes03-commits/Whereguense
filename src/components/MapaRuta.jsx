import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './MapaRuta.css';
import { useUbicacionActual } from '../hooks/useUbicacionActual';
import { calcularDistanciaMetros } from '../utils/geo';
import RutaCalculada from './RutaCalculada';
import PanelSitio from './PanelSitio';
import HistoriaSitio from './HistoriaSitio';

const RADIO_GEOFENCE_METROS = 80;
const CLAVE_GUARDADOS = 'sitiosGuardados';

const iconoUbicacion = L.divIcon({
  className: 'ubicacion-usuario-icono',
  html: '<div class="ubicacion-usuario-punto"></div>',
  iconSize: [18, 18],
});

function cargarGuardados() {
  try {
    const g = JSON.parse(localStorage.getItem(CLAVE_GUARDADOS));
    return Array.isArray(g) ? g : [];
  } catch (error) {
    console.error('Error leyendo sitios guardados:', error);
    return [];
  }
}

function normalizarTexto(s) {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function EnfocarSitio({ sitios, sitioEnfocadoId, onEnfocar }) {
  const map = useMap();

  useEffect(() => {
    if (!sitioEnfocadoId) return;
    const sitio = sitios.find(s => s.id === sitioEnfocadoId);
    if (!sitio) return;

    map.flyTo(sitio.position, 17);
    onEnfocar(sitio);
  }, [sitioEnfocadoId]);

  return null;
}

function MapaRuta({ sitios, onSellarAutomatico, sitioEnfocadoId, onVolver }) {
  const mapRef = useRef(null);
  const { ubicacion, error } = useUbicacionActual();
  const [busqueda, setBusqueda] = useState('');

  const resultadosBusqueda = busqueda.trim()
    ? sitios.filter((s) => normalizarTexto(s.name).includes(normalizarTexto(busqueda))).slice(0, 8)
    : [];

  const seleccionarResultadoBusqueda = (sitio) => {
    setBusqueda('');
    setSitioSeleccionado(sitio);
    if (mapRef.current) {
      mapRef.current.flyTo(sitio.position, 17);
    }
  };

  const [guardados, setGuardados] = useState(cargarGuardados);
  const [sitioSeleccionado, setSitioSeleccionado] = useState(null);
  const [sitioHistoria, setSitioHistoria] = useState(null);
  const [destinoRuta, setDestinoRuta] = useState(null);
  const [resumenRuta, setResumenRuta] = useState(null);
  const [errorRuta, setErrorRuta] = useState(null);

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

  const estaGuardado = (sitio) => guardados.includes(sitio.id);

  const toggleGuardado = (sitio) => {
    setGuardados((prev) => {
      const siguiente = prev.includes(sitio.id)
        ? prev.filter(id => id !== sitio.id)
        : [...prev, sitio.id];
      try {
        localStorage.setItem(CLAVE_GUARDADOS, JSON.stringify(siguiente));
      } catch (err) {
        console.error('Error guardando sitios guardados:', err);
      }
      return siguiente;
    });
  };

  const comoLlegar = (sitio) => {
    if (!ubicacion) {
      setErrorRuta('Necesitas activar tu ubicación para trazar la ruta.');
      return;
    }
    setErrorRuta(null);
    setResumenRuta(null);
    setDestinoRuta(sitio);
  };

  const cancelarRuta = () => {
    setDestinoRuta(null);
    setResumenRuta(null);
    setErrorRuta(null);
  };

  return (
    <div className="mapa-ruta-wrapper">
      <div className="mapa-top">
        <button
          className="mapa-volver-btn"
          onClick={() => onVolver?.()}
          aria-label="Volver al inicio"
          type="button"
        >
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden="true">
            <path d="M15 5l-7 7 7 7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        <div className="mapa-buscador">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
            <path d="M20 20l-3.2-3.2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <input
            type="text"
            placeholder="Buscar sitios de la ruta"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            aria-label="Buscar sitios"
          />
          {busqueda && (
            <button
              className="mapa-buscador-limpiar"
              onClick={() => setBusqueda('')}
              aria-label="Limpiar búsqueda"
              type="button"
            >
              ×
            </button>
          )}
          {busqueda.trim() && (
            <ul className="mapa-buscador-resultados">
              {resultadosBusqueda.length > 0 ? (
                resultadosBusqueda.map((sitio) => (
                  <li key={sitio.id}>
                    <button
                      type="button"
                      onClick={() => seleccionarResultadoBusqueda(sitio)}
                    >
                      {sitio.name}
                    </button>
                  </li>
                ))
              ) : (
                <li className="mapa-buscador-sin-resultados">Sin resultados</li>
              )}
            </ul>
          )}
        </div>
      </div>

      <MapContainer
        ref={mapRef}
        center={[12.4375, -86.8783]}
        zoom={13.5}
        zoomControl={false}
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
            pathOptions={{ className: 'mapa-geofence', weight: 1, fillOpacity: 0.08 }}
          />
        ))}

        {sitios.map(sitio => (
          <Marker
            key={sitio.id}
            position={sitio.position}
            eventHandlers={{
              click: () => setSitioSeleccionado(sitio),
            }}
          />
        ))}

        {ubicacion && (
          <Marker position={[ubicacion.lat, ubicacion.lng]} icon={iconoUbicacion} zIndexOffset={1000} />
        )}

        <EnfocarSitio sitios={sitios} sitioEnfocadoId={sitioEnfocadoId} onEnfocar={setSitioSeleccionado} />

        {destinoRuta && ubicacion && (
          <RutaCalculada
            puntos={[[ubicacion.lat, ubicacion.lng], destinoRuta.position]}
            onRutaCalculada={setResumenRuta}
            onError={setErrorRuta}
          />
        )}
      </MapContainer>

      {destinoRuta && (
        <div className="mapa-ruta-resumen">
          <div className="mapa-ruta-resumen-info">
            <strong>Ruta hacia {destinoRuta.name}</strong>
            {resumenRuta && (
              <span>
                {(resumenRuta.distanciaMetros / 1000).toFixed(1)} km ·{' '}
                {Math.round(resumenRuta.duracionSegundos / 60)} min
              </span>
            )}
            {errorRuta && <span className="mapa-ruta-resumen-error">{errorRuta}</span>}
          </div>
          <button
            type="button"
            className="mapa-ruta-resumen-cancelar"
            onClick={cancelarRuta}
          >
            Cancelar
          </button>
        </div>
      )}

      <PanelSitio
        sitio={sitioSeleccionado}
        estaGuardado={sitioSeleccionado ? estaGuardado(sitioSeleccionado) : false}
        onCerrar={() => setSitioSeleccionado(null)}
        onComoLlegar={(sitio) => {
          comoLlegar(sitio);
          setSitioSeleccionado(null);
        }}
        onGuardar={(sitio) => toggleGuardado(sitio)}
        onHistoria={(sitio) => setSitioHistoria(sitio)}
      />

      <HistoriaSitio
        sitio={sitioHistoria}
        onCerrar={() => setSitioHistoria(null)}
      />

      <button
        className="mapa-mi-ubicacion-btn"
        onClick={centrarEnMiUbicacion}
        disabled={!ubicacion}
        aria-label="Centrar en mi ubicación"
        type="button"
      >
        <svg viewBox="0 0 24 24" width="24" height="24" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="4.5" stroke="currentColor" strokeWidth="2" />
          <path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>

      {error && <p className="mapa-ubicacion-error">{error}</p>}
      {errorRuta && !destinoRuta && <p className="mapa-ubicacion-error">{errorRuta}</p>}
    </div>
  );
}

export default MapaRuta;
