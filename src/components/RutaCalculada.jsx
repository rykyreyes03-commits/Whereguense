import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

const PERFIL_ORS = {
  foot: 'foot-walking',
  bike: 'cycling-regular',
  car: 'driving-car',
};

function RutaCalculada({ puntos, modo = 'foot', colorLinea = '#1a3c8f', onRutaCalculada, onError }) {
  const map = useMap();

  useEffect(() => {
    if (!puntos) return;
    let cancelado = false;
    const capa = L.geoJSON(null, {
      style: { color: colorLinea, weight: 4, opacity: 0.75 },
    }).addTo(map);

    const perfil = PERFIL_ORS[modo] ?? PERFIL_ORS.foot;
    // ORS espera [longitud, latitud] -- al revés de como los guardamos
    // nosotros ([lat, lng]).
    const coordenadas = puntos.map(([lat, lng]) => [lng, lat]);

    fetch(`https://api.openrouteservice.org/v2/directions/${perfil}/geojson`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: import.meta.env.VITE_ORS_API_KEY,
      },
      body: JSON.stringify({ coordinates: coordenadas }),
    })
      .then((res) => {
        if (!res.ok) throw new Error('Error de OpenRouteService');
        return res.json();
      })
      .then((geojson) => {
        if (cancelado) return;
        capa.addData(geojson);
        const feature = geojson.features[0];
        const resumen = feature.properties.summary;
        onRutaCalculada?.({
          distanciaMetros: resumen.distance,
          duracionSegundos: resumen.duration,
          // ORS devuelve [lng, lat] (orden GeoJSON); MapaRuta.jsx espera
          // [lat, lng] para la deteccion de desvio (distanciaMinimaARuta).
          coordenadas: feature.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
        });
      })
      .catch(() => {
        if (!cancelado) onError?.('No se pudo calcular la ruta. Intenta de nuevo.');
      });

    return () => {
      cancelado = true;
      map.removeLayer(capa);
    };
  // onError y onRutaCalculada cambian en cada render del padre: incluirlas volvería a pedir la ruta sin parar.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, puntos, modo, colorLinea]);

  return null;
}

export default RutaCalculada;
