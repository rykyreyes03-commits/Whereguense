import { useState, useEffect } from 'react';
import { obtenerNivel } from '../utils/rango';
import {
  ROSTROS_IDS, ROPAS_IDS, SOMBREROS_IDS, GIGANTONA_IDS,
  ROSTRO_DEFECTO, ROPA_DEFECTO, GIGANTONA_DEFECTO,
} from '../data/avatarPiezas';

const CLAVE_DESBLOQUEOS = 'avatarDesbloqueos';
const CLAVE_SELECCION = 'avatarSeleccion';

const PRIMER_NIVEL_DESBLOQUEO = 5;
const INTERVALO_DESBLOQUEO = 10;

function cantidadDesbloqueosEsperados(nivel) {
  if (nivel < PRIMER_NIVEL_DESBLOQUEO) return 0;
  return Math.floor((nivel - PRIMER_NIVEL_DESBLOQUEO) / INTERVALO_DESBLOQUEO) + 1;
}

function cargarDesbloqueos() {
  try {
    const guardado = JSON.parse(localStorage.getItem(CLAVE_DESBLOQUEOS));
    if (guardado && typeof guardado === 'object') return guardado;
  } catch (error) {
    console.error('Error leyendo desbloqueos de avatar:', error);
  }
  return {
    rostro: [ROSTRO_DEFECTO],
    ropa: [ROPA_DEFECTO],
    sombrero: [],
    gigantona: [GIGANTONA_DEFECTO],
  };
}

function cargarSeleccion() {
  try {
    const guardado = JSON.parse(localStorage.getItem(CLAVE_SELECCION));
    if (guardado && typeof guardado === 'object') return guardado;
  } catch (error) {
    console.error('Error leyendo selección de avatar:', error);
  }
  return {
    rostro: ROSTRO_DEFECTO,
    ropa: ROPA_DEFECTO,
    sombrero: null,
    gigantona: GIGANTONA_DEFECTO,
  };
}

function elegirAlAzar(pool, excluidos) {
  const disponibles = pool.filter((id) => !excluidos.includes(id));
  if (disponibles.length === 0) return null;
  return disponibles[Math.floor(Math.random() * disponibles.length)];
}

export function useAvatarPersonalizado(cantidadSellos) {
  const [desbloqueados, setDesbloqueados] = useState(cargarDesbloqueos);
  const [seleccion, setSeleccion] = useState(cargarSeleccion);
  const [nuevosDesbloqueos, setNuevosDesbloqueos] = useState([]);
  const nivel = obtenerNivel(cantidadSellos);

  useEffect(() => {
    const esperados = cantidadDesbloqueosEsperados(nivel);
    const actualesGuardados = cargarDesbloqueos();

    const categorias = [
      { clave: 'rostro', pool: ROSTROS_IDS, tieneDefecto: true },
      { clave: 'ropa', pool: ROPAS_IDS, tieneDefecto: true },
      { clave: 'sombrero', pool: SOMBREROS_IDS, tieneDefecto: false },
      { clave: 'gigantona', pool: GIGANTONA_IDS, tieneDefecto: true },
    ];

    const nuevo = { ...actualesGuardados };
    const recienDesbloqueados = [];
    let huboCambios = false;

    categorias.forEach(({ clave, pool, tieneDefecto }) => {
      const actuales = [...(nuevo[clave] || [])];
      const extras = tieneDefecto ? actuales.length - 1 : actuales.length;
      const faltantes = esperados - Math.max(0, extras);

      for (let i = 0; i < faltantes; i++) {
        const elegido = elegirAlAzar(pool, actuales);
        if (elegido) {
          actuales.push(elegido);
          recienDesbloqueados.push({ categoria: clave, id: elegido });
          huboCambios = true;
        }
      }
      nuevo[clave] = actuales;
    });

    if (huboCambios) {
      localStorage.setItem(CLAVE_DESBLOQUEOS, JSON.stringify(nuevo));
      setDesbloqueados(nuevo);
      setNuevosDesbloqueos(recienDesbloqueados);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const elegir = (categoria, id) => {
    const nueva = { ...seleccion, [categoria]: id };
    setSeleccion(nueva);
    localStorage.setItem(CLAVE_SELECCION, JSON.stringify(nueva));
  };

  return { desbloqueados, seleccion, elegir, nuevosDesbloqueos, nivel };
}