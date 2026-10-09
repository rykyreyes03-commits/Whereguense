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
import { useTranslation } from 'react-i18next';
import { getCategoriaIcono, svgPinSitio } from '../utils/categoriaSitio';
import { useGuardados } from '../hooks/useGuardados';
import { useNegociosActivos } from '../hooks/useNegociosActivos';
import PanelNegocio from './PanelNegocio';
import PerfilNegocioPublico from './PerfilNegocioPublico';

const RADIO_GEOFENCE_DEFECTO = 80;
// Efecto radar de los círculos de sellado: el anillo sale del centro (10 % del radio) y llega justo al borde del radio real de
// sellado (100 %), desvaneciéndose, cada 3.5 s. Los círculos son SVG de Leaflet, así que se anima con setRadius/setStyle (un solo
// requestAnimationFrame para todos, a unos 30 cuadros por segundo).
const DURACION_RADAR_MS = 3500;
const RADIO_INICIAL_RADAR = 0.1;
const OPACIDAD_RADAR = 0.4;
const COLOR_RADAR = '#38BDF8';

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

// Marcador de negocio: círculo blanco con un ícono de tienda, borde azul marino (rojo si está activo: panel abierto o llegada
// con "Ver en el mapa"). Redondo, para no confundirlo con los pines de gota de los sitios. L.icon con el SVG como data URI,
// cacheado por estado.
const COLOR_NEGOCIO = '#1B2A6B';
const COLOR_NEGOCIO_ACTIVO = '#C62828';
const iconosNegocio = new Map();
function iconoNegocio(activo) {
  const clave = activo ? 'activo' : 'normal';
  if (!iconosNegocio.has(clave)) {
    const borde = activo ? COLOR_NEGOCIO_ACTIVO : COLOR_NEGOCIO;
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">'
      // r=14.7 (no 15): con el trazo de 2.5 el borde exterior llega justo al límite de 32 y no se recorta
      + `<circle cx="16" cy="16" r="14.7" fill="white" stroke="${borde}" stroke-width="2.5"/>`
      + `<path fill="${borde}" d="M8 11h16l-1.5 2H9.5zm1.5 3h13v8h-13zm2 2v4h3v-4zm5 0v4h3v-4z"/>`
      + '</svg>';
    iconosNegocio.set(clave, L.icon({
      iconUrl: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`,
      iconSize: [30, 30],
      iconAnchor: [15, 15],
    }));
  }
  return iconosNegocio.get(clave);
}

// Aro que pulsa debajo del negocio al que se llegó con "Ver en el mapa" (no se toca: solo guía la vista).
const iconoHaloNegocio = L.divIcon({
  className: 'negocio-halo-icono',
  html: '<span class="negocio-pin-halo"></span>',
  iconSize: [30, 30],
  iconAnchor: [15, 15],
});

// "Estoy aquí": pin azul claro, distinto de los marcadores de negocios y de sitios.
const iconoEstoyAqui = L.divIcon({
  className: 'estoy-aqui-icono',
  html: '<span class="estoy-aqui-halo"></span><span class="estoy-aqui-punto"></span>',
  iconSize: [44, 44],
  iconAnchor: [22, 22],
});

// Marcador de sitio: pin clásico de Leaflet (25x41) del color de su categoría con el círculo blanco de siempre;
// rojo si está seleccionado. Un icono por categoría y estado, cacheado.
const iconosSitio = new Map();
function iconoSitio(sitio, seleccionado) {
  const categoria = getCategoriaIcono(sitio);
  const clave = `${categoria.clave}-${seleccionado ? 's' : 'n'}`;
  if (!iconosSitio.has(clave)) {
    iconosSitio.set(clave, L.icon({
      iconUrl: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgPinSitio(categoria, seleccionado))}`,
      iconSize: [25, 41],
      iconAnchor: [12, 41],
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
  const { t } = useTranslation();
  const mapRef = useRef(null);
  const circulosRadarRef = useRef(new Map()); // id del sitio -> { circulo (Leaflet), base (m), desfase (ms) }
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

  // Radar de los círculos de sellado
  useEffect(() => {
    const circulos = circulosRadarRef.current;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      circulos.forEach(({ circulo }) => circulo.setStyle({ opacity: 0.25, fillOpacity: 0 }));
      return undefined;
    }
    let cuadro;
    let ultimo = 0;
    const paso = (t) => {
      cuadro = requestAnimationFrame(paso);
      if (t - ultimo < 33) return;
      ultimo = t;
      circulos.forEach(({ circulo, base, desfase }) => {
        const progreso = ((t + desfase) % DURACION_RADAR_MS) / DURACION_RADAR_MS;
        circulo.setRadius(base * (RADIO_INICIAL_RADAR + progreso * (1 - RADIO_INICIAL_RADAR)));
        circulo.setStyle({ opacity: OPACIDAD_RADAR * (1 - progreso), fillOpacity: 0 });
      });
    };
    cuadro = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(cuadro);
  }, []);

  useEffect(() => {
    if (!negocioEnfocadoId || cargandoNegocios) return;
    const negocio = negocios.find((n) => n.id === negocioEnfocadoId);
    if (negocio) enfocarNegocio(negocio);
    else setAvisoMapa(t('mapa.negocioNoMapa'));
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
      setAvisoMapa(t('mapa.activaUbicacion'));
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
        setAvisoMapa(err.code === err.PERMISSION_DENIED ? t('mapa.activaUbicacion') : t('mapa.noUbicacion'));
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
      setErrorRuta(t('mapa.rutaNecesitaUbicacion'));
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
          aria-label={t('mapa.volverInicio')}
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
            placeholder={t('mapa.buscarPlaceholder')}
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            aria-label={t('mapa.buscarAria')}
          />
          {busqueda && (
            <button
              className="mapa-buscador-limpiar"
              onClick={() => setBusqueda('')}
              aria-label={t('mapa.limpiar')}
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
                <li className="mapa-buscador-sin-resultados">{t('mapa.sinResultados')}</li>
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
        {sitios.map(sitio => {
          const base = sitio.radioSelloMetros ?? RADIO_GEOFENCE_DEFECTO;
          return (
            <Circle
              key={`radio-${sitio.id}`}
              ref={(circulo) => {
                if (circulo) {
                  // Cada sitio tiene su propio desfase: las ondas son independientes y no pulsan todas a la vez
                  circulosRadarRef.current.set(sitio.id, { circulo, base, desfase: (sitio.id * 1237) % DURACION_RADAR_MS });
                } else {
                  circulosRadarRef.current.delete(sitio.id);
                }
              }}
              center={sitio.position}
              radius={base}
              pathOptions={{
                className: 'mapa-geofence',
                color: COLOR_RADAR,
                weight: 2,
                opacity: OPACIDAD_RADAR,
                fillOpacity: 0,
              }}
            />
          );
        })}

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

        {negocios.filter((n) => n.id === negocioResaltadoId).map((negocio) => (
          <Marker
            key={`halo-${negocio.id}`}
            position={negocio.position}
            icon={iconoHaloNegocio}
            zIndexOffset={850}
            interactive={false}
            keyboard={false}
          />
        ))}

        {negocios.map(negocio => (
          <Marker
            key={`negocio-${negocio.id}`}
            position={negocio.position}
            icon={iconoNegocio(negocio.id === negocioResaltadoId || negocio.id === negocioSeleccionado?.id)}
            zIndexOffset={negocio.id === negocioResaltadoId ? 900 : negocio.id === negocioSeleccionado?.id ? 700 : 0}
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
              <strong>{t('mapa.rutaHacia', { nombre: destinoRuta.name })}</strong>
              {resumenRuta && (
                <span>
                  {(resumenRuta.distanciaMetros / 1000).toFixed(1)} km ·{' '}
                  {Math.round(resumenRuta.duracionSegundos / 60)} min
                </span>
              )}
              {destinoRuta && !modoSeguir && (
                <span className="mapa-ruta-resumen-aviso">{t('mapa.tocaUbicacion')}</span>
              )}
              {errorRuta && <span className="mapa-ruta-resumen-error">{errorRuta}</span>}
            </div>
            <button
              type="button"
              className="mapa-ruta-resumen-cancelar"
              onClick={cancelarRuta}
            >
              {t('mapa.cancelar')}
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
              {t('mapa.caminar')}
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
              {t('mapa.bicicleta')}
            </button>
            <button
              type="button"
              className={modoRuta === 'car' ? 'activo' : ''}
              onClick={() => setModoRuta('car')}
            >
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 17h14M5 17a2 2 0 104 0M15 17a2 2 0 104 0M5 17v-4l2-5h10l2 5v4" />
              </svg>
              {t('mapa.vehiculo')}
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
          else setAvisoMapa(t('mapa.negocioNoMapa'));
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
          {buscandoUbicacion ? t('comun.buscando') : t('mapa.estoyAqui')}
        </button>
      )}

      <button
        className={`mapa-mi-ubicacion-btn ${modoSeguir ? 'siguiendo' : ''}`}
        onClick={centrarEnMiUbicacion}
        disabled={!ubicacion}
        aria-label={t('mapa.centrar')}
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
