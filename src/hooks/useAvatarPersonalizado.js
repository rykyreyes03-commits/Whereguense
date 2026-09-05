import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { obtenerNivel } from '../utils/rango';
import {
  ROSTROS_IDS, ROPAS_IDS, SOMBREROS_IDS, GIGANTONA_IDS,
  ROSTRO_DEFECTO, ROPA_DEFECTO, GIGANTONA_DEFECTO,
} from '../data/avatarPiezas';

const PRIMER_NIVEL_DESBLOQUEO = 5;
const INTERVALO_DESBLOQUEO = 5;
const CANTIDAD_CANDIDATOS = 3;

function categoriasParaPersonaje(personaje) {
  if (personaje === 'gigantona') {
    return [
      { clave: 'rostro', pool: ROSTROS_IDS },
      { clave: 'gigantona', pool: GIGANTONA_IDS },
    ];
  }
  return [
    { clave: 'rostro', pool: ROSTROS_IDS },
    { clave: 'ropa', pool: ROPAS_IDS },
    { clave: 'sombrero', pool: SOMBREROS_IDS },
  ];
}

function piezasInicialesParaPersonaje(personaje) {
  return personaje === 'gigantona'
    ? [ROSTRO_DEFECTO, GIGANTONA_DEFECTO]
    : [ROSTRO_DEFECTO, ROPA_DEFECTO];
}

function milestonesAlcanzados(nivel) {
  const lista = [];
  for (let m = PRIMER_NIVEL_DESBLOQUEO; m <= nivel; m += INTERVALO_DESBLOQUEO) {
    lista.push(m);
  }
  return lista;
}

function elegirCandidatosAlAzar(desbloqueados, categorias) {
  const disponibles = [];
  categorias.forEach(({ clave, pool }) => {
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

export function useAvatarPersonalizado(usuarioId, cantidadSellos, personaje) {
  const [catalogo, setCatalogo] = useState(null);
  const [desbloqueados, setDesbloqueados] = useState({ rostro: [], ropa: [], sombrero: [], gigantona: [] });
  const [milestonesResueltos, setMilestonesResueltos] = useState([]);
  const [seleccion, setSeleccion] = useState({ rostro: null, ropa: null, sombrero: null, gigantona: null });
  const [candidatosPendientes, setCandidatosPendientes] = useState(null);
  const nivel = obtenerNivel(cantidadSellos);

  // Catálogo estático (pieza_avatar + categoria_avatar), una sola vez.
  useEffect(() => {
    let activo = true;
    Promise.all([
      supabase.from('pieza_avatar').select('id, categoria_id, clave, es_inicial'),
      supabase.from('categoria_avatar').select('id, clave'),
    ]).then(([piezasRes, categoriasRes]) => {
      if (!activo) return;
      if (piezasRes.error || categoriasRes.error) {
        console.error('Error cargando catálogo de avatar:', piezasRes.error || categoriasRes.error);
        return;
      }
      const categoriasPorId = Object.fromEntries(categoriasRes.data.map((c) => [c.id, c.clave]));
      const piezasPorId = Object.fromEntries(
        piezasRes.data.map((p) => [p.id, { ...p, categoriaClave: categoriasPorId[p.categoria_id] }])
      );
      const piezasPorClave = Object.fromEntries(
        piezasRes.data.map((p) => [p.clave, { ...p, categoriaClave: categoriasPorId[p.categoria_id] }])
      );
      const categoriasPorClave = Object.fromEntries(categoriasRes.data.map((c) => [c.clave, c.id]));
      setCatalogo({ piezasPorId, piezasPorClave, categoriasPorClave });
    });
    return () => { activo = false; };
  }, []);

  // Desbloqueos + selección del usuario.
  useEffect(() => {
    if (!usuarioId || !catalogo || !personaje) return undefined;
    let activo = true;

    async function cargar() {
      let { data: desbloqueosData, error: errorDesbloqueos } = await supabase
        .from('pieza_desbloqueada')
        .select('pieza_id, nivel_hito')
        .eq('usuario_id', usuarioId);

      if (errorDesbloqueos) {
        console.error('Error cargando piezas desbloqueadas:', errorDesbloqueos);
        return;
      }

      if (!desbloqueosData || desbloqueosData.length === 0) {
        const filas = piezasInicialesParaPersonaje(personaje)
          .map((clave) => catalogo.piezasPorClave[clave]?.id)
          .filter(Boolean)
          .map((piezaId) => ({ usuario_id: usuarioId, pieza_id: piezaId, nivel_hito: null }));

        if (filas.length > 0) {
          const { error: errorSeed } = await supabase.from('pieza_desbloqueada').insert(filas);
          if (errorSeed) {
            console.error('Error sembrando piezas iniciales:', errorSeed);
          } else {
            const { data: recargado } = await supabase
              .from('pieza_desbloqueada')
              .select('pieza_id, nivel_hito')
              .eq('usuario_id', usuarioId);
            desbloqueosData = recargado || [];
          }
        }
      }

      if (!activo) return;

      const nuevosDesbloqueados = { rostro: [], ropa: [], sombrero: [], gigantona: [] };
      const hitos = new Set();
      (desbloqueosData || []).forEach((fila) => {
        const pieza = catalogo.piezasPorId[fila.pieza_id];
        if (!pieza) return;
        if (!nuevosDesbloqueados[pieza.categoriaClave]) nuevosDesbloqueados[pieza.categoriaClave] = [];
        nuevosDesbloqueados[pieza.categoriaClave].push(pieza.clave);
        if (fila.nivel_hito != null) hitos.add(fila.nivel_hito);
      });
      setDesbloqueados(nuevosDesbloqueados);
      setMilestonesResueltos([...hitos]);

      const { data: equipadoData, error: errorEquipado } = await supabase
        .from('avatar_equipado')
        .select('categoria_id, pieza_id')
        .eq('usuario_id', usuarioId);

      if (!activo) return;
      if (errorEquipado) {
        console.error('Error cargando avatar equipado:', errorEquipado);
      }

      const categoriasPorId = Object.fromEntries(
        Object.entries(catalogo.categoriasPorClave).map(([clave, id]) => [id, clave])
      );
      const nuevaSeleccion = {
        rostro: ROSTRO_DEFECTO,
        ropa: personaje === 'gigantona' ? null : ROPA_DEFECTO,
        sombrero: null,
        gigantona: personaje === 'gigantona' ? GIGANTONA_DEFECTO : null,
      };
      (equipadoData || []).forEach((fila) => {
        const categoriaClave = categoriasPorId[fila.categoria_id];
        if (!categoriaClave) return;
        const pieza = fila.pieza_id != null ? catalogo.piezasPorId[fila.pieza_id] : null;
        nuevaSeleccion[categoriaClave] = pieza ? pieza.clave : null;
      });
      setSeleccion(nuevaSeleccion);
    }

    cargar();
    return () => { activo = false; };
  }, [usuarioId, catalogo, personaje]);

  useEffect(() => {
    if (candidatosPendientes || !personaje) return;
    const alcanzados = milestonesAlcanzados(nivel);
    const pendiente = alcanzados.find((m) => !milestonesResueltos.includes(m));
    if (!pendiente) return;
    const categorias = categoriasParaPersonaje(personaje);
    const opciones = elegirCandidatosAlAzar(desbloqueados, categorias);
    if (opciones.length === 0) return;
    setCandidatosPendientes({ milestone: pendiente, opciones });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nivel, personaje, desbloqueados, milestonesResueltos]);

  const elegirDesbloqueo = useCallback(async (opcionElegida) => {
    if (!candidatosPendientes || !usuarioId || !catalogo) return;
    const pieza = catalogo.piezasPorClave[opcionElegida.id];
    if (!pieza) return;

    const { error } = await supabase.from('pieza_desbloqueada').insert({
      usuario_id: usuarioId,
      pieza_id: pieza.id,
      nivel_hito: candidatosPendientes.milestone,
    });

    if (error) {
      console.error('Error guardando desbloqueo:', error);
      return;
    }

    setDesbloqueados((prev) => ({
      ...prev,
      [opcionElegida.categoria]: [...(prev[opcionElegida.categoria] || []), opcionElegida.id],
    }));
    setMilestonesResueltos((prev) => [...prev, candidatosPendientes.milestone]);
    setCandidatosPendientes(null);
  }, [candidatosPendientes, usuarioId, catalogo]);

  const elegir = useCallback(async (categoria, id) => {
    if (!usuarioId || !catalogo) return;
    const categoriaId = catalogo.categoriasPorClave[categoria];
    if (!categoriaId) return;
    const piezaId = id ? catalogo.piezasPorClave[id]?.id ?? null : null;

    setSeleccion((prev) => ({ ...prev, [categoria]: id }));

    const { error } = await supabase
      .from('avatar_equipado')
      .upsert({ usuario_id: usuarioId, categoria_id: categoriaId, pieza_id: piezaId });

    if (error) {
      console.error('Error guardando selección de avatar:', error);
    }
  }, [usuarioId, catalogo]);

  return { desbloqueados, seleccion, elegir, nivel, candidatosPendientes, elegirDesbloqueo };
}
