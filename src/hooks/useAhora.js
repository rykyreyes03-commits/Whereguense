import { useEffect, useState } from 'react';

// La hora actual (ms desde 1970) que se vuelve a leer cada minuto mientras la pantalla está abierta, y de inmediato
// al volver a la app (los temporizadores se frenan en segundo plano). Lo usan las pantallas que ocultan lo que ya
// terminó o venció: sin esto, una actividad que termina con la pantalla abierta seguiría a la vista hasta recargar.
export function useAhora(intervaloMs = 60000) {
  const [ahora, setAhora] = useState(() => Date.now());

  useEffect(() => {
    const actualizar = () => setAhora(Date.now());
    const id = setInterval(actualizar, intervaloMs);
    const alVolver = () => { if (document.visibilityState === 'visible') actualizar(); };
    document.addEventListener('visibilitychange', alVolver);
    window.addEventListener('focus', actualizar);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', alVolver);
      window.removeEventListener('focus', actualizar);
    };
  }, [intervaloMs]);

  return ahora;
}
