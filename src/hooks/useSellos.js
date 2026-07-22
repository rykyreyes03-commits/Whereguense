import { useEffect, useState } from 'react';

export function useSellos() {
  const [sellos, setSellos] = useState([]);

  useEffect(() => {
    try {
      const guardados = JSON.parse(localStorage.getItem('sellos') || '[]');
      if (Array.isArray(guardados)) {
        setSellos(guardados);
      }
    } catch (error) {
      console.error('Error leyendo sellos guardados:', error);
      setSellos([]);
    }
  }, []);

  const sellar = (sitio) => {
    if (sellos.some(s => s.sitioId === sitio.id)) {
      return { exito: false, mensaje: `Ya tienes el sello de ${sitio.name}` };
    }

    const nuevoSello = {
      id: Date.now(),
      sitioId: sitio.id,
      nombre: sitio.name,
      fecha: new Date().toLocaleDateString('es-NI'),
    };

    const nuevosSellos = [...sellos, nuevoSello];
    setSellos(nuevosSellos);

    try {
      localStorage.setItem('sellos', JSON.stringify(nuevosSellos));
    } catch (error) {
      console.error('Error guardando sello:', error);
    }

    return { exito: true, mensaje: `¡Sello obtenido en ${sitio.name}!` };
  };

  return { sellos, sellar };
}