import { useState, useEffect } from 'react';
import i18n from '../i18n';

export function useUbicacionActual() {
  const [ubicacion, setUbicacion] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!('geolocation' in navigator)) {
      setError(i18n.t('mapa.gpsNoSoporta'));
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
            ? i18n.t('mapa.gpsPermitir')
            : i18n.t('mapa.gpsFallo')
        );
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  return { ubicacion, error };
}
