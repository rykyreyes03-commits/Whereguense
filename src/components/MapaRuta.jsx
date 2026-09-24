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
import { useGuardados } from '../hooks/useGuardados';
import { useNegociosActivos } from '../hooks/useNegociosActivos';
import PanelNegocio from './PanelNegocio';
import PerfilNegocioPublico from './PerfilNegocioPublico';

const RADIO_GEOFENCE_DEFECTO = 80;

const iconoUbicacion = L.divIcon({
  className: 'ubicacion-usuario-icono',
  html: `
    <div class="ubicacion-usuario-anillo"></div>
    <div class="ubicacion-usuario-anillo ubicacion-usuario-anillo-2"></div>
    <div class="ubicacion-usuario-punto"></div>
  `,
  iconSize: [60, 60],
  iconAnchor: [30, 30],
});

const iconoNegocio = L.divIcon({
  className: 'negocio-marcador-icono',
  html: `<svg viewBox="0 0 24 32" width="28" height="36">
    <path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 20 12 20s12-11 12-20c0-6.6-5.4-12-12-12z" fill="var(--color-coral)"/>
    <circle cx="12" cy="12" r="5" fill="white"/>
  </svg>`,
  iconSize: [28, 36],
  iconAnchor: [14, 36],
});

function normalizarTexto(s) {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function distanciaMinimaARuta(lat, lng, coordenadasRuta) {
  if (!coordenadasRuta || coordenadasRuta.length === 0) return Infinity;
  let minima = Infinity;
  for (const [rutaLat, rutaLng] of coordenadasRuta) {
    const d = calcularDistanciaMetros(lat, lng, rutaLat, rutaLng);
    if (d < minima) minima = d;
  }
  return minima;
}

const UMBRAL_DESVIO_METROS = 40;

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

function SeguidorUbicacion({ ubicacion, activo, onSeguirDesactivado }) {
  const map = useMap();

  useEffect(() => {
    if (!activo) return undefined;

    const handleDragStart = () => {
      onSeguirDesactivado();
    };

    map.on('dragstart', handleDragStart);
    return () => {
      map.off('dragstart', handleDragStart);
    };
  }, [activo, map, onSeguirDesactivado]);

  useEffect(() => {
    if (!activo || !ubicacion) return;
    map.setView([ubicacion.lat, ubicacion.lng], map.getZoom(), { animate: true });
  }, [activo, ubicacion, map]);

  return null;
}

function MapaRuta({ sitios, onSellarAutomatico, sitioEnfocadoId, onVolver, usuarioId }) {
  const mapRef = useRef(null);
  const { ubicacion, error } = useUbicacionActual();
  const { estaGuardado: estaGuardadoSupabase, toggleGuardar } = useGuardados(usuarioId);
  const { negocios } = useNegociosActivos();
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

  const [sitioSeleccionado, setSitioSeleccionado] = useState(null);
  const [negocioSeleccionado, setNegocioSeleccionado] = useState(null);
  const [negocioPerfilPublico, setNegocioPerfilPublico] = useState(null);
  const [sitioHistoria, setSitioHistoria] = useState(null);
  const [destinoRuta, setDestinoRuta] = useState(null);
  const [origenRuta, setOrigenRuta] = useState(null);
  const [modoSeguir, setModoSeguir] = useState(false);
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
      const radio = sitio.radioSelloMetros ?? RADIO_GEOFENCE_DEFECTO;
      if (distancia <= radio) {
        onSellarAutomatico?.(sitio, ubicacion);
      }
    });
  }, [ubicacion, sitios, onSellarAutomatico]);

  useEffect(() => {
    if (!ubicacion || !destinoRuta || !resumenRuta?.coordenadas) return;

    const distancia = distanciaMinimaARuta(ubicacion.lat, ubicacion.lng, resumenRuta.coordenadas);
    if (distancia > UMBRAL_DESVIO_METROS) {
      setOrigenRuta({ lat: ubicacion.lat, lng: ubicacion.lng });
    }
  }, [ubicacion, destinoRuta, resumenRuta]);

  const centrarEnMiUbicacion = () => {
    if (ubicacion && mapRef.current) {
      mapRef.current.flyTo([ubicacion.lat, ubicacion.lng], 16);
      if (destinoRuta) {
        setModoSeguir(true);
      }
    }
  };

  const comoLlegar = (sitio) => {
    if (!ubicacion) {
      setErrorRuta('Necesitas activar tu ubicación para trazar la ruta.');
      return;
    }
    setErrorRuta(null);
    setResumenRuta(null);
    setDestinoRuta(sitio);
    setOrigenRuta({ lat: ubicacion.lat, lng: ubicacion.lng });
    setModoSeguir(true);
  };

  const cancelarRuta = () => {
    setDestinoRuta(null);
    setOrigenRuta(null);
    setResumenRuta(null);
    setErrorRuta(null);
    setModoSeguir(false);
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
        maxZoom={20}
        zoomControl={false}
        style={{ flex: 1, width: '100%' }}
      >
        <TileLayer
          url={`https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?key=${import.meta.env.VITE_CARTO_API_KEY}`}
          maxZoom={20}
          attribution='&copy; OpenStreetMap contributors &copy; CARTO'
        />
        {sitios.map(sitio => (
          <Circle
            key={`radio-${sitio.id}`}
            center={sitio.position}
            radius={sitio.radioSelloMetros ?? RADIO_GEOFENCE_DEFECTO}
            pathOptions={{
              className: `mapa-geofence mapa-geofence-delay-${sitio.id % 3}`,
              weight: 1,
              fillOpacity: 0.08,
            }}
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

        {negocios.map(negocio => (
          <Marker
            key={`negocio-${negocio.id}`}
            position={negocio.position}
            icon={iconoNegocio}
            eventHandlers={{
              click: () => setNegocioSeleccionado(negocio),
            }}
          />
        ))}

        {ubicacion && (
          <Marker position={[ubicacion.lat, ubicacion.lng]} icon={iconoUbicacion} zIndexOffset={1000} />
        )}

        <EnfocarSitio sitios={sitios} sitioEnfocadoId={sitioEnfocadoId} onEnfocar={setSitioSeleccionado} />

        <SeguidorUbicacion
          ubicacion={ubicacion}
          activo={modoSeguir}
          onSeguirDesactivado={() => setModoSeguir(false)}
        />

        {destinoRuta && origenRuta && (
          <RutaCalculada
            puntos={[[origenRuta.lat, origenRuta.lng], destinoRuta.position]}
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
            {destinoRuta && !modoSeguir && (
              <span className="mapa-ruta-resumen-aviso">Toca el botón de ubicación para seguir la ruta</span>
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
        estaGuardado={sitioSeleccionado ? estaGuardadoSupabase('sitio', sitioSeleccionado.id) : false}
        onCerrar={() => setSitioSeleccionado(null)}
        onComoLlegar={(sitio) => {
          comoLlegar(sitio);
          setSitioSeleccionado(null);
        }}
        onGuardar={async (sitio) => {
          const resultado = await toggleGuardar('sitio', sitio.id, { nombre: sitio.name });
          if (!resultado.exito) {
            console.error('Error al guardar sitio:', resultado.mensaje);
          }
        }}
        onHistoria={(sitio) => setSitioHistoria(sitio)}
      />

      <PanelNegocio
        negocio={negocioSeleccionado}
        estaGuardado={negocioSeleccionado ? estaGuardadoSupabase('negocio', negocioSeleccionado.id) : false}
        onCerrar={() => setNegocioSeleccionado(null)}
        onComoLlegar={(negocio) => {
          comoLlegar(negocio);
          setNegocioSeleccionado(null);
        }}
        onGuardar={async (negocio) => {
          const resultado = await toggleGuardar('negocio', negocio.id, { nombre: negocio.name });
          if (!resultado.exito) {
            console.error('Error al guardar negocio:', resultado.mensaje);
          }
        }}
        onVerPerfil={(negocio) => {
          setNegocioPerfilPublico(negocio);
          setNegocioSeleccionado(null);
        }}
      />

      <HistoriaSitio
        sitio={sitioHistoria}
        onCerrar={() => setSitioHistoria(null)}
      />

      <PerfilNegocioPublico
        negocio={negocioPerfilPublico}
        onCerrar={() => setNegocioPerfilPublico(null)}
      />

      <button
        className={`mapa-mi-ubicacion-btn ${modoSeguir ? 'siguiendo' : ''}`}
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
