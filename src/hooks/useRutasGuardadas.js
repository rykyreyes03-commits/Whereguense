import { useState } from 'react';

const CLAVE = 'rutasGuardadas';

function cargar() {
  try {
    const guardado = JSON.parse(localStorage.getItem(CLAVE));
    if (Array.isArray(guardado)) return guardado;
  } catch (error) {
    console.error('Error leyendo rutas guardadas:', error);
  }
  return [];
}

export function useRutasGuardadas() {
  const [guardadas, setGuardadas] = useState(cargar);

  const estaGuardada = (rutaId) => guardadas.includes(rutaId);

  const alternar = (rutaId) => {
    const nueva = estaGuardada(rutaId)
      ? guardadas.filter((id) => id !== rutaId)
      : [...guardadas, rutaId];
    setGuardadas(nueva);
    localStorage.setItem(CLAVE, JSON.stringify(nueva));
  };

  return { guardadas, estaGuardada, alternar };
}