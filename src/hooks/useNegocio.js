import { useEffect, useState } from 'react';

export function useNegocio() {
  const [negocio, setNegocio] = useState(null);

  useEffect(() => {
    try {
      const guardado = JSON.parse(localStorage.getItem('negocio') || 'null');
      if (guardado) {
        setNegocio(guardado);
      }
    } catch (error) {
      console.error('Error leyendo negocio guardado:', error);
    }
  }, []);

  const guardarNegocio = (nuevoNegocio) => {
    setNegocio(nuevoNegocio);
    try {
      localStorage.setItem('negocio', JSON.stringify(nuevoNegocio));
    } catch (error) {
      console.error('Error guardando negocio:', error);
    }
  };

  const registrar = (datos) => {
    const nuevoNegocio = {
      ...datos,
      estado: 'pendiente',
      fechaEnvio: new Date().toISOString(),
      motivoRechazo: null,
    };
    guardarNegocio(nuevoNegocio);
    return nuevoNegocio;
  };

  const simularAprobar = () => {
    if (!negocio) return;
    guardarNegocio({ ...negocio, estado: 'activo', motivoRechazo: null });
  };

  const simularRechazar = (motivo) => {
    if (!negocio) return;
    guardarNegocio({ ...negocio, estado: 'rechazado', motivoRechazo: motivo || 'No especificado' });
  };

  return { negocio, registrar, simularAprobar, simularRechazar };
}
