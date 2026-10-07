import { useState, useEffect, useRef } from 'react';
import { cambiarIdioma } from './i18n';
import './App.css';
import Landing from './components/Landing';
import LandingEventos from './components/LandingEventos';
import LandingMapas from './components/LandingMapas';
import LandingRutaDetalle from './components/LandingRutaDetalle';
import DatosPerfil from './components/DatosPerfil';
import OnboardingEmprendedor from './components/OnboardingEmprendedor';
import PanelAdmin from './components/PanelAdmin';
import Onboarding from './components/Onboarding';
import Login from './components/Login';
import MfaEnrolamiento from './components/MfaEnrolamiento';
import MfaChallenge from './components/MfaChallenge';
import Proposito from './components/Proposito';
import SeleccionDanzante from './components/SeleccionDanzante';
import Inicio from './components/Inicio';
import MapaRuta from './components/MapaRuta';
import MisSellos from './components/MisSellos';
import MisGuardados from './components/MisGuardados';
import DetalleSello from './components/DetalleSello';
import Perfil from './components/Perfil';
import RutasDestacadas from './components/RutasDestacadas';
import DetalleRuta from './components/DetalleRuta';
import Eventos from './components/Eventos';
import DetalleEvento from './components/DetalleEvento';
import Ranking from './components/Ranking';
import Personalizacion from './components/Personalizacion';
import Menu from './components/Menu';
import RegistroNegocio from './components/RegistroNegocio';
import EstadoNegocio from './components/EstadoNegocio';
import PerfilNegocio from './components/PerfilNegocio';
import EscanearQR from './components/EscanearQR';
import EscanearCupon from './components/EscanearCupon';
import MisCupones from './components/MisCupones';
import Toast from './components/Toast';
import LevelUpModal from './components/LevelUpModal';
import OrbitalRoute from './components/OrbitalRoute';
import parejaImg from './assets/flujo-inicial/whereguense_pareja.webp';
import { sitios } from './data/sitios';
import { rutas } from './data/rutas';
import { useSellos } from './hooks/useSellos';
import { useNivel } from './hooks/useNivel';
import { useCuponesTurista } from './hooks/useCuponesTurista';
import { useNegocio } from './hooks/useNegocio';
import { useEventosPublicos } from './hooks/useEventosPublicos';
import { useAvatarPersonalizado } from './hooks/useAvatarPersonalizado';
import { supabase } from './lib/supabaseClient';
import { aPersonajeDB, aPersonajeLocal } from './utils/avatarPersonaje';
import { hoyManagua, eventoParaInicio, eventoDesdeGuardado } from './utils/eventos';
import L from 'leaflet';

function pantallaInicial() {
  const completado = localStorage.getItem('flujoInicialCompletado');
  return completado === 'true' ? 'inicio' : 'landing';
}

function App() {
  const [pantalla, setPantalla] = useState(pantallaInicial);
  const [pantallaAnterior, setPantallaAnterior] = useState('inicio');
  const [perfilOrigen, setPerfilOrigen] = useState('inicio'); // de dónde se abrió Perfil (su Volver regresa allí)
  const [session, setSession] = useState(null);
  const [usuarioActual, setUsuarioActual] = useState(null);

  // Con sesión, el idioma preferido de la cuenta manda sobre el del navegador.
  useEffect(() => {
    if (usuarioActual?.idioma_preferido) cambiarIdioma(usuarioActual.idioma_preferido);
  }, [usuarioActual?.idioma_preferido]);
  const [authInicializada, setAuthInicializada] = useState(false);
  const [cargandoUsuario, setCargandoUsuario] = useState(false);
  const [guardandoDanzante, setGuardandoDanzante] = useState(false);
  const [errorDanzante, setErrorDanzante] = useState(null);
  const [guardandoDatosPerfil, setGuardandoDatosPerfil] = useState(false);
  const [errorDatosPerfil, setErrorDatosPerfil] = useState(null);
  const rutaAplicadaRef = useRef(false);
  const authCargando = !authInicializada || cargandoUsuario;
  const [rutaActivaId, setRutaActivaId] = useState(null);
  const [eventoActivoId, setEventoActivoId] = useState(null);
  // Desde dónde se abrió el detalle de un evento: "Volver" regresa ahí.
  const [origenDetalleEvento, setOrigenDetalleEvento] = useState('eventos');
  // Un favorito que ya terminó y la base ya no devuelve se abre con lo que se guardó (eventoDesdeGuardado).
  const [eventoGuardado, setEventoGuardado] = useState(null);
  const seleccionarEvento = (id) => {
    // Se guarda una copia del evento al abrirlo: si termina con el detalle abierto y la base ya no lo devuelve, se sigue viendo ("Ya terminó").
    setEventoGuardado(todosLosEventos.find((e) => e.id === id) || null);
    setEventoActivoId(id);
    setOrigenDetalleEvento('eventos');
  };
  const [sitioSeleccionadoId, setSitioSeleccionadoId] = useState(null);
  const [sitioEnfocadoId, setSitioEnfocadoId] = useState(null);
  const [negocioEnfocadoId, setNegocioEnfocadoId] = useState(null); // negocio al que se llegó con "Ver en el mapa"
  const { sellos, sellar, canjearQR } = useSellos(usuarioActual?.id);
  // Nivel por puntos (038): cobre 1, plata 0.5, oro 2; de N a N+1 hacen falta N*2.
  const nivelInfo = useNivel(usuarioActual?.id, sellos);
  const nivel = nivelInfo.nivel;
  const {
    cupones,
    cargando: cargandoCupones,
    recargar: recargarCupones,
    obtenerCupon,
    iniciarCanje,
    usarCupon,
  } = useCuponesTurista(usuarioActual?.id);
  const {
    negocio,
    horarios,
    horariosGuardados,
    fotos,
    productos,
    registrar,
    actualizarHorarios,
    actualizarUbicacion,
    actualizarPerfil,
    guardarDiseno,
    subirPortada,
    subirLogoDiseno,
    subirLogo,
    subirFoto,
    eliminarFoto,
    ordenarFotos,
    agregarProducto,
    eliminarProducto,
    actividades,
    actividadesQR,
    cargarActividades,
    sellosEntregados,
    crearActividad,
    editarActividad,
    borrarActividad,
    reenviarSolicitudSello,
    eliminarActividadQR,
  } = useNegocio(usuarioActual?.id);
  const { eventos, todos: todosLosEventos, cargando: cargandoEventos, recargar: recargarEventos } = useEventosPublicos();
  const {
    desbloqueados,
    seleccion,
    elegir,
    candidatosPendientes,
    elegirDesbloqueo,
  } = useAvatarPersonalizado(usuarioActual?.id, nivelInfo.nivel, localStorage.getItem('avatarElegido'));
  const [toastSitio, setToastSitio] = useState(null);
  const [sitioResaltadoPasaporte, setSitioResaltadoPasaporte] = useState(null);
  const [mostrarSubidaNivel, setMostrarSubidaNivel] = useState(false);
  const nivelPrevioRef = useRef(null);

  // Solo cuenta como subida un aumento real del nivel ya cargado, no el salto de "todavía no cargó" a "cargó".
  useEffect(() => {
    if (!nivelInfo.listo) {
      nivelPrevioRef.current = null;
      return;
    }
    if (nivelPrevioRef.current != null && nivel > nivelPrevioRef.current) {
      setMostrarSubidaNivel(true);
    }
    nivelPrevioRef.current = nivel;
  }, [nivelInfo.listo, nivel]);

  useEffect(() => {
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
      iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    });
  }, []);

  const [avisoSesionExpirada, setAvisoSesionExpirada] = useState(false);
  const cierreManualRef = useRef(false);

  // Arranque de auth: sesión inicial + suscripción a cambios de sesión.
  useEffect(() => {
    let activo = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!activo) return;
      setSession(data.session ?? null);
      setAuthInicializada(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((evento, nuevaSesion) => {
      if (!activo) return;
      setSession(nuevaSesion ?? null);
      setAuthInicializada(true);
      if (!nuevaSesion) {
        setUsuarioActual(null);
        rutaAplicadaRef.current = false;
        // Perdimos la sesión sin que fuera un clic nuestro en "Cerrar sesión"
        // (cierreManualRef): el refresh token venció o se invalidó. Mandamos
        // al usuario a Login con un aviso claro en vez de dejarlo varado en
        // la pantalla en la que estaba.
        if (evento === 'SIGNED_OUT' && !cierreManualRef.current) {
          setAvisoSesionExpirada(true);
          setPantalla('login');
        }
        cierreManualRef.current = false;
      }
    });

    return () => {
      activo = false;
      subscription.unsubscribe();
    };
  }, []);

  // --- 2FA (MFA obligatorio con TOTP) ---
  const [factoresMfa, setFactoresMfa] = useState([]);
  const [aalMfa, setAalMfa] = useState(null);
  const [verificandoMfa, setVerificandoMfa] = useState(false);
  const [mfaRecargarTick, setMfaRecargarTick] = useState(0);

  useEffect(() => {
    if (!session?.user?.id) {
      setFactoresMfa([]);
      setAalMfa(null);
      setVerificandoMfa(false);
      return;
    }
    let activo = true;
    setVerificandoMfa(true);
    (async () => {
      const [{ data: factoresData, error: errFactores }, { data: aalData, error: errAal }] = await Promise.all([
        supabase.auth.mfa.listFactors(),
        supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
      ]);
      if (!activo) return;
      if (errFactores) console.error('Error listando factores MFA:', errFactores);
      if (errAal) console.error('Error obteniendo nivel MFA:', errAal);
      setFactoresMfa(factoresData?.totp ?? []);
      setAalMfa(aalData ?? null);
      setVerificandoMfa(false);
    })();
    return () => { activo = false; };
  }, [session?.user?.id, mfaRecargarTick]);

  const factorTotpVerificado = factoresMfa.find((f) => f.status === 'verified');
  const necesitaEnrolarMfa = !!session && !verificandoMfa && !factorTotpVerificado;
  const necesitaChallengeMfa = !!session && !verificandoMfa && !!factorTotpVerificado
    && aalMfa?.currentLevel === 'aal1' && aalMfa?.nextLevel === 'aal2';

  // Con sesión: resolver la fila de `usuario` (crearla la primera vez) y, la
  // primera vez por sesión, enrutar según onboarding_completado. El invitado sin
  // sesión conserva el valor inicial de `pantalla` (pantallaInicial()).
  useEffect(() => {
    const userId = session?.user?.id;
    if (!userId) return;

    let activo = true;
    // Marca de "sincronizando con Supabase Auth"; el resto de setState de este
    // efecto ocurre dentro del callback async.
    setCargandoUsuario(true);

    (async () => {
      try {
        let { data: fila, error } = await supabase
          .from('usuario')
          .select('*')
          .eq('id', userId)
          .maybeSingle();
        if (error) throw error;

        if (!fila) {
          const email = session.user.email ?? '';
          const nombre_usuario = email.split('@')[0] || 'usuario';
          const creada = await supabase
            .from('usuario')
            .insert({ id: userId, email, nombre_usuario, rol: 'turista' })
            .select()
            .single();
          if (creada.error) throw creada.error;
          fila = creada.data;
        }

        if (!activo) return;
        setUsuarioActual(fila);

        if (!rutaAplicadaRef.current) {
          rutaAplicadaRef.current = true;
          if (fila.onboarding_completado) {
            localStorage.setItem('avatarElegido', aPersonajeLocal(fila.avatar_personaje));
            localStorage.setItem('flujoInicialCompletado', 'true');
            setPantalla('inicio');
          } else {
            setPantalla('proposito');
          }
        }
      } catch (e) {
        console.error('Error resolviendo la fila de usuario:', e);
        if (activo) setUsuarioActual(null);
      } finally {
        if (activo) setCargandoUsuario(false);
      }
    })();

    return () => {
      activo = false;
      setCargandoUsuario(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id]);

  const handleSellar = async (sitio, ubicacion) => {
    const resultado = await sellar(sitio, ubicacion);
    if (resultado.exito) {
      setToastSitio(sitio);
    } else {
      alert(resultado.mensaje);
    }
  };

  const intentarSellarPorGeofencing = async (sitio, ubicacion) => {
    const resultado = await sellar(sitio, ubicacion);
    if (resultado.exito) {
      setToastSitio(sitio);
    }
  };

  const handleCerrarToast = () => setToastSitio(null);

  const handleClickToast = () => {
    if (toastSitio) {
      setSitioResaltadoPasaporte(toastSitio.id);
    }
    setToastSitio(null);
    cambiarPantalla('pasaporte');
  };

  const cambiarPantalla = (nueva) => {
    if (nueva === 'menu') {
      setPantallaAnterior(pantalla);
    }
    if (nueva === 'perfil') {
      setPerfilOrigen(pantalla);
    }
    setPantalla(nueva);
  };

  const irAlMapaConSitio = (sitioId) => {
    setSitioEnfocadoId(sitioId);
    setNegocioEnfocadoId(null);
    cambiarPantalla('mapa');
  };

  // "Ver en el mapa" de la ficha de un negocio: abre el mapa principal centrado en él y con su marcador resaltado.
  const irAlMapaConNegocio = (negocioId) => {
    setSitioEnfocadoId(null);
    setNegocioEnfocadoId(negocioId);
    cambiarPantalla('mapa');
  };

  // El negocio enfocado (y con él el botón "Estoy aquí") solo vive mientras se está en el mapa.
  useEffect(() => {
    if (pantalla !== 'mapa') setNegocioEnfocadoId(null);
  }, [pantalla]);

  const irAFlujoNegocio = () => {
    if (negocio?.estado === 'activo') {
      setPantalla('perfilNegocio');
    } else if (negocio) {
      setPantalla('estadoNegocio');
    } else {
      setPantalla('registroNegocio');
    }
  };

  const handleElegirProposito = (tipo) => {
    if (tipo === 'emprendimiento') {
      irAFlujoNegocio();
      return;
    }
    setPantalla('onboarding');
  };

  const handleTerminarOnboarding = () => {
    setPantalla('datosPerfil');
  };

  const handleGuardarDatosPerfil = async (datos) => {
    setErrorDatosPerfil(null);
    setGuardandoDatosPerfil(true);

    if (usuarioActual) {
      const { error } = await supabase
        .from('usuario')
        .update({
          nombre_usuario: datos.nombre,
          pais: datos.pais || null,
          idioma_preferido: datos.idioma,
        })
        .eq('id', usuarioActual.id);

      setGuardandoDatosPerfil(false);

      if (error) {
        console.error('Error guardando datos de perfil:', error);
        if (error.code === '23505') {
          setErrorDatosPerfil('Ese nombre de usuario ya está en uso. Elige otro.');
        } else {
          setErrorDatosPerfil('No se pudo guardar tu información. Intenta de nuevo.');
        }
        return;
      }

      setUsuarioActual((u) =>
        u ? { ...u, nombre_usuario: datos.nombre, pais: datos.pais, idioma_preferido: datos.idioma } : u
      );
    } else {
      setGuardandoDatosPerfil(false);
      cambiarIdioma(datos.idioma);
      try {
        localStorage.setItem('perfilUsuario', JSON.stringify({
          nombre: datos.nombre,
          pais: datos.pais,
          idioma: datos.idioma,
        }));
      } catch (e) {
        console.error('Error guardando perfil local:', e);
      }
    }

    setPantalla('danzante');
  };

  // Cambiar el idioma desde Configuración: se aplica ya y, con sesión, se guarda en la cuenta (para el próximo inicio de sesión).
  const handleCambiarIdioma = async (idioma) => {
    cambiarIdioma(idioma);
    if (!usuarioActual) return;
    const { error } = await supabase.from('usuario').update({ idioma_preferido: idioma }).eq('id', usuarioActual.id);
    if (error) {
      console.error('Error guardando el idioma:', error);
      return;
    }
    setUsuarioActual((u) => (u ? { ...u, idioma_preferido: idioma } : u));
  };

  const handleActualizarPerfilUsuario = async (datos) => {
    if (!usuarioActual) return { exito: false, mensaje: 'Necesitas iniciar sesión.' };

    const { error } = await supabase
      .from('usuario')
      .update({
        nombre_usuario: datos.nombre,
        pais: datos.pais || null,
        idioma_preferido: datos.idioma,
      })
      .eq('id', usuarioActual.id);

    if (error) {
      console.error('Error actualizando perfil:', error);
      if (error.code === '23505') {
        return { exito: false, mensaje: 'Ese nombre de usuario ya está en uso. Elige otro.' };
      }
      return { exito: false, mensaje: 'No se pudo guardar tu perfil. Intenta de nuevo.' };
    }

    setUsuarioActual((u) =>
      u ? { ...u, nombre_usuario: datos.nombre, pais: datos.pais, idioma_preferido: datos.idioma } : u
    );
    return { exito: true };
  };

  const handleElegirDanzante = async (avatar) => {
    if (!usuarioActual) {
      localStorage.setItem('avatarElegido', avatar);
      localStorage.setItem('flujoInicialCompletado', 'true');
      setPantalla('inicio');
      return;
    }

    setErrorDanzante(null);
    setGuardandoDanzante(true);

    const avatarDB = aPersonajeDB(avatar);

    const { error } = await supabase
      .from('usuario')
      .update({ avatar_personaje: avatarDB, onboarding_completado: true })
      .eq('id', usuarioActual.id);

    setGuardandoDanzante(false);

    if (error) {
      console.error('Error guardando el danzante en usuario:', error);
      setErrorDanzante('No se pudo guardar tu elección. Revisa tu conexión e intenta de nuevo.');
      return;
    }

    localStorage.setItem('avatarElegido', avatar);
    localStorage.setItem('flujoInicialCompletado', 'true');
    setUsuarioActual((u) =>
      u ? { ...u, avatar_personaje: avatarDB, onboarding_completado: true } : u
    );
    setPantalla('inicio');
  };

  const handleCerrarSesionGlobal = async () => {
    cierreManualRef.current = true;
    setAvisoSesionExpirada(false);
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.error('Error cerrando sesión en Supabase:', e);
    }
    localStorage.removeItem('sellos');
    localStorage.removeItem('perfilUsuario');
    localStorage.removeItem('avatarElegido');
    localStorage.removeItem('flujoInicialCompletado');
    localStorage.removeItem('avatarMilestonesResueltos');
    localStorage.removeItem('avatarCandidatosPendientes');
    setPantalla('login');
  };

  if (authCargando || (session && verificandoMfa)) {
    return (
      <div className="app-cargando" role="status">
        <div className="app-cargando-gigantona" aria-hidden="true">
          <img src={parejaImg} alt="" />
        </div>
        <OrbitalRoute />
        <p className="app-cargando-texto">Cargando…</p>
      </div>
    );
  }

  if (necesitaEnrolarMfa) {
    return (
      <MfaEnrolamiento
        onCompletado={() => setMfaRecargarTick((t) => t + 1)}
        onCerrarSesion={handleCerrarSesionGlobal}
      />
    );
  }
  if (necesitaChallengeMfa) {
    return (
      <MfaChallenge
        factorId={factorTotpVerificado.id}
        onVerificado={() => setMfaRecargarTick((t) => t + 1)}
        onCerrarSesion={handleCerrarSesionGlobal}
      />
    );
  }

  if (pantalla === 'landing') {
    return <Landing onComenzar={() => setPantalla('login')} onNavigate={cambiarPantalla} />;
  }

  if (pantalla === 'landingEventos') {
    return (
      <LandingEventos
        onNavigate={cambiarPantalla}
        onComenzar={() => cambiarPantalla('login')}
      />
    );
  }

  if (pantalla === 'landingMapas') {
    return <LandingMapas onNavigate={cambiarPantalla} onComenzar={() => cambiarPantalla('login')} />;
  }

  if (pantalla === 'landingRuta_dariana') {
    return <LandingRutaDetalle tipo="dariana" onNavigate={cambiarPantalla} onComenzar={() => cambiarPantalla('login')} />;
  }

  if (pantalla === 'landingRuta_culturales') {
    return <LandingRutaDetalle tipo="culturales" onNavigate={cambiarPantalla} onComenzar={() => cambiarPantalla('login')} />;
  }

  if (pantalla === 'landingRuta_creativos') {
    return <LandingRutaDetalle tipo="creativos" onNavigate={cambiarPantalla} onComenzar={() => cambiarPantalla('login')} />;
  }

  if (pantalla === 'login') {
    return (
      <Login
        onIniciarComoInvitado={() => setPantalla('proposito')}
        onVolverALanding={() => setPantalla('landing')}
        sesionExpirada={avisoSesionExpirada}
      />
    );
  }

  if (pantalla === 'proposito') {
    return (
      <Proposito
        onElegir={handleElegirProposito}
        onVolverALanding={() => setPantalla('landing')}
      />
    );
  }

  if (pantalla === 'escanearQR') {
    return (
      <EscanearQR
        onVolver={() => cambiarPantalla('inicio')}
        onCanjearQR={canjearQR}
        onNavigate={cambiarPantalla}
      />
    );
  }

  if (pantalla === 'escanearCupon') {
    return (
      <EscanearCupon
        cupones={cupones}
        onObtenerCupon={obtenerCupon}
        onIniciarCanje={iniciarCanje}
        onUsarCupon={usarCupon}
        onVolver={() => cambiarPantalla('inicio')}
        onNavigate={cambiarPantalla}
      />
    );
  }

  if (pantalla === 'misCupones') {
    return (
      <MisCupones
        cupones={cupones}
        cargando={cargandoCupones}
        onRecargar={recargarCupones}
        onNavigate={cambiarPantalla}
      />
    );
  }

  if (pantalla === 'onboarding') {
    return <Onboarding onTerminar={handleTerminarOnboarding} />;
  }

  if (pantalla === 'datosPerfil') {
    return (
      <DatosPerfil
        valorInicial={{
          nombre: usuarioActual?.nombre_usuario || '',
          pais: usuarioActual?.pais || '',
          idioma: usuarioActual?.idioma_preferido || 'es',
        }}
        onContinuar={handleGuardarDatosPerfil}
        onVolverALanding={() => setPantalla('landing')}
        guardando={guardandoDatosPerfil}
        error={errorDatosPerfil}
      />
    );
  }

  if (pantalla === 'danzante') {
    return (
      <SeleccionDanzante
        onElegir={handleElegirDanzante}
        onVolverALanding={() => setPantalla('landing')}
        guardando={guardandoDanzante}
        error={errorDanzante}
      />
    );
  }

  if (pantalla === 'inicio') {
    const hoy = hoyManagua(); // la fecha de Managua (con toISOString era la UTC: de noche ya era "mañana")
    // El evento en curso o, si no hay, el próximo en empezar (antes solo contaban los que ya estaban en curso).
    const eventoVigente = eventoParaInicio(eventos, hoy);
    return (
      <Inicio
        sitios={sitios}
        rutas={rutas}
        eventos={eventos}
        sellos={sellos}
        usuarioId={usuarioActual?.id}
        onNavigate={cambiarPantalla}
        onSeleccionarRuta={setRutaActivaId}
        onSeleccionarSitio={setSitioSeleccionadoId}
        onVerSitioEnMapa={irAlMapaConSitio}
        onSeleccionarEvento={seleccionarEvento}
        eventoDestacadoId={eventoVigente?.id}
      />
    );
  }

  if (pantalla === 'mapa') {
    return (
      <div className="mapa-pantalla">
        <MapaRuta
          sitios={sitios}
          sellos={sellos}
          onSellar={handleSellar}
          onSellarAutomatico={intentarSellarPorGeofencing}
          sitioEnfocadoId={sitioEnfocadoId}
          negocioEnfocadoId={negocioEnfocadoId}
          onVolver={() => cambiarPantalla('inicio')}
          onVerRuta={(sitio) => {
            // Abre la ruta que incluye el sitio; si ninguna lo incluye, la lista de rutas.
            const ruta = rutas.find((r) => r.sitios.some((s) => s.id === sitio.id));
            if (ruta) { setRutaActivaId(ruta.id); cambiarPantalla('detalleRuta'); } else cambiarPantalla('rutas');
          }}
          usuarioId={usuarioActual?.id}
        />
        <Toast sitio={toastSitio} onClose={handleCerrarToast} onClick={handleClickToast} />
        {mostrarSubidaNivel && (
          <LevelUpModal
            nivel={nivel}
            candidatos={candidatosPendientes}
            onElegir={(opcion) => {
              elegirDesbloqueo(opcion);
              setMostrarSubidaNivel(false);
            }}
            onCerrar={() => setMostrarSubidaNivel(false)}
          />
        )}
      </div>
    );
  }

  if (pantalla === 'guardados') {
    return (
      <MisGuardados
        usuarioId={usuarioActual?.id}
        eventos={eventos}
        onVerSitio={irAlMapaConSitio}
        onVerEvento={(id, datosGuardados) => {
          setEventoGuardado(datosGuardados ? eventoDesdeGuardado(id, datosGuardados) : (todosLosEventos.find((e) => e.id === id) || null));
          setEventoActivoId(id);
          setOrigenDetalleEvento('guardados');
          cambiarPantalla('detalleEvento');
        }}
        onVolver={() => cambiarPantalla('inicio')}
      />
    );
  }

  if (pantalla === 'pasaporte') {
    return (
      <MisSellos
        sellos={sellos}
        sitios={sitios}
        onNavigate={cambiarPantalla}
        onSeleccionarSitio={setSitioSeleccionadoId}
        sitioResaltadoId={sitioResaltadoPasaporte}
        usuario={usuarioActual}
        rutas={rutas}
        nivelInfo={nivelInfo}
      />
    );
  }

  if (pantalla === 'detalleSello') {
    const sitio = sitios.find(s => s.id === sitioSeleccionadoId);
    const sello = sellos.find(s => s.sitioId === sitioSeleccionadoId);
    return (
      <DetalleSello
        sitio={sitio}
        sello={sello}
        onNavigate={(p) => {
          if (p === 'mapa') setSitioEnfocadoId(sitio.id);
          cambiarPantalla(p);
        }}
      />
    );
  }

  if (pantalla === 'perfil') {
    return (
      <Perfil
        sellos={sellos}
        total={sitios.length}
        onNavigate={cambiarPantalla}
        onVolver={() => setPantalla(perfilOrigen)}
        modoNegocio={perfilOrigen === 'perfilNegocio'}
        onCerrarSesion={handleCerrarSesionGlobal}
        usuarioActual={usuarioActual}
        onActualizarPerfil={handleActualizarPerfilUsuario}
      />
    );
  }

  if (pantalla === 'rutas') {
    return <RutasDestacadas rutas={rutas} sellos={sellos} onNavigate={cambiarPantalla} onSeleccionarRuta={setRutaActivaId} />;
  }

  if (pantalla === 'detalleRuta') {
    const ruta = rutas.find(r => r.id === rutaActivaId);
    return <DetalleRuta ruta={ruta} sellos={sellos} onNavigate={cambiarPantalla} />;
  }

  if (pantalla === 'eventos') {
    return (
      <Eventos
        eventos={eventos}
        cargando={cargandoEventos}
        onRecargar={recargarEventos}
        onNavigate={cambiarPantalla}
        onSeleccionarEvento={seleccionarEvento}
      />
    );
  }

  if (pantalla === 'detalleEvento') {
    const vivo = todosLosEventos.find(e => e.id === eventoActivoId);
    // Lo guardado manda si es un favorito terminado; si no, el evento al día y, si ya no llega de la base, la copia de cuando se abrió.
    const evento = eventoGuardado && eventoGuardado.id === eventoActivoId && (eventoGuardado.desdeGuardado || !vivo)
      ? eventoGuardado
      : vivo;
    return (
      <DetalleEvento
        evento={evento}
        onNavigate={cambiarPantalla}
        usuarioId={usuarioActual?.id}
        volverA={origenDetalleEvento}
        onVerNegocioEnMapa={irAlMapaConNegocio}
      />
    );
  }

  if (pantalla === 'ranking') {
    return <Ranking sellos={sellos} onNavigate={cambiarPantalla} />;
  }

  if (pantalla === 'personalizacion') {
    return (
      <>
        <Personalizacion
          onNavigate={cambiarPantalla}
          desbloqueados={desbloqueados}
          seleccion={seleccion}
          elegir={elegir}
          nivel={nivel}
          nivelInfo={nivelInfo}
        />
        {mostrarSubidaNivel && (
          <LevelUpModal
            nivel={nivel}
            candidatos={candidatosPendientes}
            onElegir={(opcion) => {
              elegirDesbloqueo(opcion);
              setMostrarSubidaNivel(false);
            }}
            onCerrar={() => setMostrarSubidaNivel(false)}
          />
        )}
      </>
    );
  }

  if (pantalla === 'onboardingEmprendedor') {
    return <OnboardingEmprendedor onTerminar={() => cambiarPantalla('registroEnviado')} />;
  }

  if (pantalla === 'registroNegocio') {
    return (
      <RegistroNegocio
        onVolver={() => cambiarPantalla('proposito')}
        onRegistrar={async (datos) => {
          const resultado = await registrar(datos);
          if (resultado.exito) {
            cambiarPantalla('onboardingEmprendedor');
          } else {
            window.alert(resultado.mensaje);
          }
        }}
      />
    );
  }

  if (pantalla === 'registroEnviado') {
    return (
      <EstadoNegocio
        vista="enviado"
        onContinuar={() => cambiarPantalla('estadoNegocio')}
      />
    );
  }

  if (pantalla === 'estadoNegocio') {
    return (
      <EstadoNegocio
        vista={negocio?.estado === 'rechazado' ? 'rechazado' : 'pendiente'}
        motivoRechazo={negocio?.motivoRechazo}
        onCorregir={() => cambiarPantalla('registroNegocio')}
      />
    );
  }

  if (pantalla === 'panelAdmin') {
    // setPantalla y no cambiarPantalla: este Volver regresa al Menú, y cambiarPantalla('menu')
    // guardaría 'panelAdmin' como pantallaAnterior (el Volver del Menú volvería al Panel).
    return <PanelAdmin onVolver={() => setPantalla('menu')} usuarioId={usuarioActual?.id} />;
  }

  if (pantalla === 'perfilNegocio') {
    return (
      <PerfilNegocio
        negocio={negocio}
        horarios={horarios}
        horariosGuardados={horariosGuardados}
        fotos={fotos}
        productos={productos}
        onNavigate={cambiarPantalla}
        onActualizarHorarios={actualizarHorarios}
        onActualizarUbicacion={actualizarUbicacion}
        onActualizarPerfil={actualizarPerfil}
        onGuardarDiseno={guardarDiseno}
        onSubirPortada={(file) => subirPortada(usuarioActual?.id, file)}
        onSubirLogoDiseno={(file) => subirLogoDiseno(usuarioActual?.id, file)}
        onSubirLogo={(file) => subirLogo(usuarioActual?.id, file)}
        onSubirFoto={(file) => subirFoto(usuarioActual?.id, file)}
        onEliminarFoto={eliminarFoto}
        onOrdenarFotos={ordenarFotos}
        onAgregarProducto={agregarProducto}
        onEliminarProducto={eliminarProducto}
        actividades={actividades}
        actividadesQR={actividadesQR}
        onRecargarActividades={cargarActividades}
        onCrearActividad={crearActividad}
        sellosEntregados={sellosEntregados}
        onEditarActividad={editarActividad}
        onBorrarActividad={borrarActividad}
        onReenviarSello={reenviarSolicitudSello}
        onEliminarActividad={eliminarActividadQR}
      />
    );
  }

  if (pantalla === 'menu') {
    return (
      <Menu
        onNavigate={cambiarPantalla}
        onVolver={() => cambiarPantalla(pantallaAnterior)}
        onCerrarSesion={handleCerrarSesionGlobal}
        onMiNegocio={irAFlujoNegocio}
        onCambiarIdioma={handleCambiarIdioma}
        // Si el menú se abrió desde el panel del emprendedor, se muestra su versión (sin lo del turista).
        modoNegocio={pantallaAnterior === 'perfilNegocio'}
        esAdmin={usuarioActual?.rol === 'admin'}
      />
    );
  }

  return (
    <div className="app-pantalla-desconocida">
      <div className="app-pantalla-desconocida-panel">
        <h2 className="app-pantalla-desconocida-titulo">Esta pantalla no está disponible</h2>
        <p className="app-pantalla-desconocida-sub">
          Algo te trajo a un lugar que todavía no existe en Wheregüense.
        </p>
        <button
          className="app-pantalla-desconocida-btn"
          onClick={() => cambiarPantalla('inicio')}
        >
          Volver al inicio
        </button>
      </div>
    </div>
  );
}

export default App;
