import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet-routing-machine';

function RutaCalculada({ sitios }) {
  const map = useMap();

  useEffect(() => {
    if (!map || sitios.length < 2) return;

    const waypoints = sitios.map(sitio => L.latLng(sitio.position[0], sitio.position[1]));

    const control = L.Routing.control({
      waypoints,
      routeWhileDragging: false,
      addWaypoints: false,
      draggableWaypoints: false,
      fitSelectedRoutes: false,
      show: false,
      lineOptions: {
        styles: [{ color: '#d32f2f', weight: 4, opacity: 0.7 }],
      },
      createMarker: () => null,
    }).addTo(map);

    return () => {
      map.removeControl(control);
    };
  }, [map, sitios]);

  return null;
}

export default RutaCalculada;