import { useState, useEffect } from 'react';
import { obtenerNivel } from '../utils/rango';
import {
  ROSTROS_IDS, ROPAS_IDS, SOMBREROS_IDS, GIGANTONA_IDS,
  ROSTRO_DEFECTO, ROPA_DEFECTO, GIGANTONA_DEFECTO,
} from '../data/avatarPiezas';

const CLAVE_DESBLOQUEOS = 'avatarDesbloqueos';
const CLAVE_SELECCION = 'avatarSeleccion';
const CLAVE_MILESTONES = 'avatarMilestonesResueltos';
const CLAVE_CANDIDATOS = 'avatarCandidatosPendientes';

const PRIMER_NIVEL_DESBLOQUEO = 5;
const INTERVALO_DESBLOQUEO = 5;
const CANTIDAD_CANDIDATOS = 3;

const CATEGORIAS = [
  { clave: 'rostro', pool: ROSTROS_IDS },
  { clave: 'ropa', pool: ROPAS_IDS },
  { clave: 'sombrero', pool: SOMBREROS_IDS },
  { clave: 'gigantona', pool: GIGANTONA_IDS },
];

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

function cargarMilestonesResueltos() {
  try {
    const guardado = JSON.parse(localStorage.getItem(CLAVE_MILESTONES));
    if (Array.isArray(guardado)) return guardado;
  } catch (error) {
    console.error('Error leyendo milestones resueltos:', error);
  }
  return [];
}

function cargarCandidatos() {
  try {
    const guardado = JSON.parse(localStorage.getItem(CLAVE_CANDIDATOS));
    if (guardado && typeof guardado === 'object') return guardado;
  } catch (error) {
    console.error('Error leyendo candidatos pendientes:', error);
  }
  return null;
}

function milestonesAlcanzados(nivel) {
  const lista = [];
  for (let m = PRIMER_NIVEL_DESBLOQUEO; m <= nivel; m += INTERVALO_DESBLOQUEO) {
    lista.push(m);
  }
  return lista;
}

function elegirCandidatosAlAzar(desbloqueados) {
  const disponibles = [];
  CATEGORIAS.forEach(({ clave, pool }) => {
    const actuales = desbloqueados[clave] || [];
    pool.forEach((id) => {
      if (!actuales.includes(id)) {
        disponibles.push({ categoria: clave, id });
      }
    });
  });

  const elegidos = [];
  const restantes = [...disponibles];
  while (elegidos.length < CANTIDAD_CANDIDATOS && restantes.length > 0) {
    const indice = Math.floor(Math.random() * restantes.length);
    elegidos.push(restantes[indice]);
    restantes.splice(indice, 1);
  }
  return elegidos;
}

export function useAvatarPersonalizado(cantidadSellos) {
  const [desbloqueados, setDesbloqueados] = useState(cargarDesbloqueos);
  const [seleccion, setSeleccion] = useState(cargarSeleccion);
  const [milestonesResueltos, setMilestonesResueltos] = useState(cargarMilestonesResueltos);
  const [candidatosPendientes, setCandidatosPendientes] = useState(cargarCandidatos);
  const nivel = obtenerNivel(cantidadSellos);

  useEffect(() => {
    if (candidatosPendientes) return;

    const alcanzados = milestonesAlcanzados(nivel);
    const pendiente = alcanzados.find((m) => !milestonesResueltos.includes(m));
    if (!pendiente) return;

    const opciones = elegirCandidatosAlAzar(desbloqueados);
    if (opciones.length === 0) return;

    const nuevo = { milestone: pendiente, opciones };
    setCandidatosPendientes(nuevo);
    try {
      localStorage.setItem(CLAVE_CANDIDATOS, JSON.stringify(nuevo));
    } catch (error) {
      console.error('Error guardando candidatos pendientes:', error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nivel]);

  const elegirDesbloqueo = (opcionElegida) => {
    if (!candidatosPendientes) return;

    const actuales = { ...desbloqueados };
    actuales[opcionElegida.categoria] = [...(actuales[opcionElegida.categoria] || []), opcionElegida.id];

    const resueltos = [...milestonesResueltos, candidatosPendientes.milestone];

    setDesbloqueados(actuales);
    setMilestonesResueltos(resueltos);
    setCandidatosPendientes(null);

    try {
      localStorage.setItem(CLAVE_DESBLOQUEOS, JSON.stringify(actuales));
      localStorage.setItem(CLAVE_MILESTONES, JSON.stringify(resueltos));
      localStorage.removeItem(CLAVE_CANDIDATOS);
    } catch (error) {
      console.error('Error guardando elección de accesorio:', error);
    }
  };

  const elegir = (categoria, id) => {
    const nueva = { ...seleccion, [categoria]: id };
    setSeleccion(nueva);
    try {
      localStorage.setItem(CLAVE_SELECCION, JSON.stringify(nueva));
    } catch (error) {
      console.error('Error guardando selección de avatar:', error);
    }
  };

  return { desbloqueados, seleccion, elegir, nivel, candidatosPendientes, elegirDesbloqueo };
}
