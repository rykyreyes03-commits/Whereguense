import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './MapaRuta.css';
import { useUbicacionActual } from '../hooks/useUbicacionActual';
import { calcularDistanciaMetros } from '../utils/geo';
import RutaCalculada from './RutaCalculada';
import PanelSitio from './PanelSitio';
import HistoriaSitio from './HistoriaSitio';
import DetalleSitio from './DetalleSitio';
import { getCategoriaIcono } from '../utils/categoriaSitio';
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

// Marcador del negocio al que se llegó con "Ver en el mapa": más grande y con un halo que pulsa.
const iconoNegocioResaltado = L.divIcon({
  className: 'negocio-marcador-icono negocio-marcador-resaltado',
  html: `<span class="negocio-marcador-halo"></span><svg viewBox="0 0 24 32" width="38" height="50">
    <path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 20 12 20s12-11 12-20c0-6.6-5.4-12-12-12z" fill="var(--color-coral)" stroke="white" stroke-width="1.5"/>
    <circle cx="12" cy="12" r="5" fill="white"/>
  </svg>`,
  iconSize: [38, 50],
  iconAnchor: [19, 50],
});

// "Estoy aquí": pin azul claro, distinto del pin coral de los negocios.
const iconoEstoyAqui = L.divIcon({
  className: 'estoy-aqui-icono',
  html: '<span class="estoy-aqui-halo"></span><span class="estoy-aqui-punto"></span>',
  iconSize: [44, 44],
  iconAnchor: [22, 22],
});

// Marcador de sitio: pin de gota azul marino con el emoji de su categoría en el centro (rojo si está seleccionado).
// HTML puro (el emoji dentro de un SVG se veía borroso); estilos en MapaRuta.css (.sitio-pin).
// Se cachea un icono por categoría y estado.
const COLOR_PIN_SITIO = '#1B2A6B';
const iconosSitio = new Map();
function iconoSitio(sitio, seleccionado) {
  const categoria = getCategoriaIcono(sitio);
  const clave = `${categoria.clave}-${seleccionado ? 's' : 'n'}`;
  if (!iconosSitio.has(clave)) {
    iconosSitio.set(clave, L.divIcon({
      className: '',
      html: `<div class="sitio-pin${seleccionado ? ' sitio-pin--activo' : ''}" style="--pin-color: ${COLOR_PIN_SITIO}"><span class="sitio-pin-emoji">${categoria.emoji}</span></div>`,
      iconSize: [32, 44],
      // La punta (esquina inferior izquierda del cuadro) queda en (20, 49) tras girar -45° una caja de 32x44 sobre su centro.
      iconAnchor: [20, 49],
    }));
  }
  return iconosSitio.get(clave);
}

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
    // Solo reacciona a un sitio nuevo enfocado; map, sitios y onEnfocar cambian en cada render y no deben volver a volar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

function MapaRuta({ sitios, onSellarAutomatico, sitioEnfocadoId, negocioEnfocadoId = null, onVolver, onVerRuta, usuarioId }) {
  const mapRef = useRef(null);
  const { ubicacion, error } = useUbicacionActual();
  const { estaGuardado: estaGuardadoSupabase, toggleGuardar } = useGuardados(usuarioId);
  const { negocios, cargando: cargandoNegocios } = useNegociosActivos();
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
  const [sitioDetalle, setSitioDetalle] = useState(null);
  const [destinoRuta, setDestinoRuta] = useState(null);
  const [origenRuta, setOrigenRuta] = useState(null);
  const [modoSeguir, setModoSeguir] = useState(false);
  const [resumenRuta, setResumenRuta] = useState(null);
  const [errorRuta, setErrorRuta] = useState(null);
  const [modoRuta, setModoRuta] = useState('foot'); // 'foot' | 'bike' | 'car'
  // Llegada con "Ver en el mapa": negocio resaltado y botón "Estoy aquí" (que vive solo mientras se está en esta pantalla).
  const [llegadaDesdeFicha, setLlegadaDesdeFicha] = useState(Boolean(negocioEnfocadoId));
  const [negocioResaltadoId, setNegocioResaltadoId] = useState(null);
  const [estoyAqui, setEstoyAqui] = useState(null); // { lat, lng } de la última vez que se tocó "Estoy aquí"
  const [buscandoUbicacion, setBuscandoUbicacion] = useState(false);
  const [avisoMapa, setAvisoMapa] = useState(null);

  // Vuela hasta el negocio y deja su marcador resaltado. No abre su panel: taparía el marcador (queda en el centro del mapa) y el
  // botón "Estoy aquí"; el panel se abre tocando el marcador, como siempre.
  const enfocarNegocio = useCallback((negocio) => {
    setNegocioResaltadoId(negocio.id);
    setNegocioSeleccionado(null);
    setLlegadaDesdeFicha(true);
    if (mapRef.current) mapRef.current.flyTo(negocio.position, 17);
  }, []);

  useEffect(() => {
    if (!negocioEnfocadoId || cargandoNegocios) return;
    const negocio = negocios.find((n) => n.id === negocioEnfocadoId);
    if (negocio) enfocarNegocio(negocio);
    else setAvisoMapa('Este negocio no está en el mapa por ahora.');
    // Solo reacciona a un negocio nuevo enfocado o a que termine de cargar la lista.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [negocioEnfocadoId, cargandoNegocios]);

  useEffect(() => {
    if (!avisoMapa) return undefined;
    const t = setTimeout(() => setAvisoMapa(null), 4500);
    return () => clearTimeout(t);
  }, [avisoMapa]);

  // Pide la ubicación del navegador (al tocar, no antes). Si acepta: centra el mapa y pone el pin azul claro.
  const irAEstoyAqui = () => {
    if (!('geolocation' in navigator)) {
      setAvisoMapa('Activa la ubicación en tu navegador');
      return;
    }
    setBuscandoUbicacion(true);
    navigator.geolocation.getCurrentPosition(
      (posicion) => {
        const punto = { lat: posicion.coords.latitude, lng: posicion.coords.longitude };
        setBuscandoUbicacion(false);
        setEstoyAqui(punto);
        setAvisoMapa(null);
        if (mapRef.current) mapRef.current.flyTo([punto.lat, punto.lng], 17);
      },
      (err) => {
        setBuscandoUbicacion(false);
        setAvisoMapa(err.code === err.PERMISSION_DENIED ? 'Activa la ubicación en tu navegador' : 'No se pudo obtener tu ubicación. Intenta de nuevo.');
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );
  };

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

  const puntosRuta = useMemo(() => {
    if (!origenRuta || !destinoRuta) return null;
    return [[origenRuta.lat, origenRuta.lng], destinoRuta.position];
  }, [origenRuta, destinoRuta]);

  const comoLlegar = (sitio) => {
    if (!ubicacion) {
      setErrorRuta('Necesitas activar tu ubicación para trazar la ruta.');
      return;
    }
    setErrorRuta(null);
    setResumenRuta(null);
    setModoRuta('foot');
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
            icon={iconoSitio(sitio, sitio.id === sitioSeleccionado?.id)}
            zIndexOffset={sitio.id === sitioSeleccionado?.id ? 800 : 0}
            eventHandlers={{
              click: () => setSitioSeleccionado(sitio),
            }}
          />
        ))}

        {negocios.map(negocio => (
          <Marker
            key={`negocio-${negocio.id}${negocio.id === negocioResaltadoId ? '-resaltado' : ''}`}
            position={negocio.position}
            icon={negocio.id === negocioResaltadoId ? iconoNegocioResaltado : iconoNegocio}
            zIndexOffset={negocio.id === negocioResaltadoId ? 900 : 0}
            eventHandlers={{
              click: () => setNegocioSeleccionado(negocio),
            }}
          />
        ))}

        {ubicacion && !estoyAqui && (
          <Marker position={[ubicacion.lat, ubicacion.lng]} icon={iconoUbicacion} zIndexOffset={1000} />
        )}

        {estoyAqui && (
          <Marker
            position={ubicacion ? [ubicacion.lat, ubicacion.lng] : [estoyAqui.lat, estoyAqui.lng]}
            icon={iconoEstoyAqui}
            zIndexOffset={1100}
            interactive={false}
            keyboard={false}
          />
        )}

        <EnfocarSitio sitios={sitios} sitioEnfocadoId={sitioEnfocadoId} onEnfocar={setSitioSeleccionado} />

        <SeguidorUbicacion
          ubicacion={ubicacion}
          activo={modoSeguir}
          onSeguirDesactivado={() => setModoSeguir(false)}
        />

        {destinoRuta && origenRuta && puntosRuta && (
          <RutaCalculada
            puntos={puntosRuta}
            modo={modoRuta}
            onRutaCalculada={setResumenRuta}
            onError={setErrorRuta}
          />
        )}
      </MapContainer>

      {destinoRuta && (
        <div className="mapa-ruta-resumen">
          <div className="mapa-ruta-resumen-fila">
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
          <div className="mapa-ruta-modos">
            <button
              type="button"
              className={modoRuta === 'foot' ? 'activo' : ''}
              onClick={() => setModoRuta('foot')}
            >
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="13" cy="4" r="2" />
                <path d="M10 22l1-6-3-2 1-5 4-1 3 3v5l2 6" />
                <path d="M8 10l-3 2" />
              </svg>
              Caminar
            </button>
            <button
              type="button"
              className={modoRuta === 'bike' ? 'activo' : ''}
              onClick={() => setModoRuta('bike')}
            >
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="5.5" cy="17.5" r="3.5" />
                <circle cx="18.5" cy="17.5" r="3.5" />
                <path d="M5.5 17.5L9 8h6l3 5.5H9M9 8L7 5H5" />
              </svg>
              Bicicleta
            </button>
            <button
              type="button"
              className={modoRuta === 'car' ? 'activo' : ''}
              onClick={() => setModoRuta('car')}
            >
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 17h14M5 17a2 2 0 104 0M15 17a2 2 0 104 0M5 17v-4l2-5h10l2 5v4" />
              </svg>
              Vehículo
            </button>
          </div>
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
        onVerDetalle={(sitio) => setSitioDetalle(sitio)}
      />

      <DetalleSitio
        sitio={sitioDetalle}
        estaGuardado={sitioDetalle ? estaGuardadoSupabase('sitio', sitioDetalle.id) : false}
        onVolver={() => setSitioDetalle(null)}
        onCerrar={() => { setSitioDetalle(null); setSitioSeleccionado(null); }}
        onGuardar={async (sitio) => {
          const resultado = await toggleGuardar('sitio', sitio.id, { nombre: sitio.name });
          if (!resultado.exito) console.error('Error al guardar sitio:', resultado.mensaje);
        }}
        onHistoria={(sitio) => setSitioHistoria(sitio)}
        onVerRuta={(sitio) => onVerRuta?.(sitio)}
        onLlegar={(sitio) => {
          setSitioDetalle(null);
          setSitioSeleccionado(null);
          if (mapRef.current) mapRef.current.flyTo(sitio.position, 17);
        }}
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
        onVerEnMapa={(id) => {
          const negocio = negocios.find((n) => n.id === id);
          if (negocio) enfocarNegocio(negocio);
          else setAvisoMapa('Este negocio no está en el mapa por ahora.');
        }}
      />

      {llegadaDesdeFicha && (
        <button
          type="button"
          className="mapa-estoy-aqui-btn"
          onClick={irAEstoyAqui}
          disabled={buscandoUbicacion}
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden="true">
            <circle cx="12" cy="12" r="4" fill="currentColor" />
            <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="2" />
            <path d="M12 1.5v3M12 19.5v3M1.5 12h3M19.5 12h3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          {buscandoUbicacion ? 'Buscando…' : 'Estoy aquí'}
        </button>
      )}

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

      {avisoMapa && <p className="mapa-ubicacion-error" role="status">{avisoMapa}</p>}
      {error && !avisoMapa && <p className="mapa-ubicacion-error">{error}</p>}
      {errorRuta && !destinoRuta && <p className="mapa-ubicacion-error">{errorRuta}</p>}
    </div>
  );
}

export default MapaRuta;
