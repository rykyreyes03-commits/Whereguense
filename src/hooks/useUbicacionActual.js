import { useState, useEffect } from 'react';

export function useUbicacionActual() {
  const [ubicacion, setUbicacion] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!('geolocation' in navigator)) {
      setError('Tu navegador no soporta geolocalización.');
      return undefined;
    }

    const watchId = navigator.geolocation.watchPosition(
      (posicion) => {
        setUbicacion({
          lat: posicion.coords.latitude,
          lng: posicion.coords.longitude,
        });
        setError(null);
      },
      (err) => {
        setError(
          err.code === err.PERMISSION_DENIED
            ? 'Necesitas permitir la ubicación para verte en el mapa.'
            : 'No se pudo obtener tu ubicación.'
        );
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  return { ubicacion, error };
}
