import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet-routing-machine';

function RutaCalculada({ puntos, colorLinea = '#1a3c8f', onRutaCalculada, onError }) {
  const map = useMap();

  useEffect(() => {
    if (!map || !puntos || puntos.length < 2) return;

    const waypoints = puntos.map(([lat, lng]) => L.latLng(lat, lng));

    const control = L.Routing.control({
      waypoints,
      routeWhileDragging: false,
      addWaypoints: false,
      draggableWaypoints: false,
      fitSelectedRoutes: true,
      show: false,
      lineOptions: {
        styles: [{ color: colorLinea, weight: 4, opacity: 0.75 }],
      },
      createMarker: () => null,
    })
      .on('routesfound', (e) => {
        const resumen = e.routes?.[0]?.summary;
        if (resumen) {
          onRutaCalculada?.({
            distanciaMetros: resumen.totalDistance,
            duracionSegundos: resumen.totalTime,
          });
        }
      })
      .on('routingerror', (e) => {
        console.error('Error calculando ruta:', e.error);
        onError?.('No se pudo calcular la ruta. Revisa tu conexión e intenta de nuevo.');
      })
      .addTo(map);

    return () => {
      map.removeControl(control);
    };
  }, [map, puntos]);

  return null;
}

export default RutaCalculada;
