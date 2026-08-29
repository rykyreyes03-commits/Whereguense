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

  const actualizarHorarios = (horarios) => {
    if (!negocio) return;
    guardarNegocio({ ...negocio, horarios });
  };

  const actualizarUbicacion = (ubicacion) => {
    if (!negocio) return;
    guardarNegocio({ ...negocio, ubicacion });
  };

  const agregarProducto = (nombre) => {
    if (!negocio) return;
    const nuevoProducto = { id: Date.now(), nombre };
    const productos = [...(negocio.productos || []), nuevoProducto];
    guardarNegocio({ ...negocio, productos });
  };

  const eliminarProducto = (id) => {
    if (!negocio) return;
    const productos = (negocio.productos || []).filter((p) => p.id !== id);
    guardarNegocio({ ...negocio, productos });
  };

  const generarQR = (datosQR) => {
    if (!negocio) return;
    guardarNegocio({ ...negocio, qr: datosQR });
  };

  return {
    negocio,
    registrar,
    simularAprobar,
    simularRechazar,
    actualizarHorarios,
    actualizarUbicacion,
    agregarProducto,
    eliminarProducto,
    generarQR,
  };
}
