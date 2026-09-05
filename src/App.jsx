import { useState, useEffect, useRef } from 'react';
import './App.css';
import Landing from './components/Landing';
import LandingNavbar from './components/LandingNavbar';
import LandingEventos from './components/LandingEventos';
import LandingMapas from './components/LandingMapas';
import LandingRutaDetalle from './components/LandingRutaDetalle';
import DatosPerfil from './components/DatosPerfil';
import OnboardingEmprendedor from './components/OnboardingEmprendedor';
import Onboarding from './components/Onboarding';
import Login from './components/Login';
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
import GenerarQR from './components/GenerarQR';
import EscanearQR from './components/EscanearQR';
import Toast from './components/Toast';
import LevelUpModal from './components/LevelUpModal';
import { sitios } from './data/sitios';
import { rutas } from './data/rutas';
import { eventos } from './data/eventos';
import { useSellos } from './hooks/useSellos';
import { useNegocio } from './hooks/useNegocio';
import { useAvatarPersonalizado } from './hooks/useAvatarPersonalizado';
import { supabase } from './lib/supabaseClient';
import { aPersonajeDB, aPersonajeLocal } from './utils/avatarPersonaje';
import L from 'leaflet';

function pantallaInicial() {
  const completado = localStorage.getItem('flujoInicialCompletado');
  return completado === 'true' ? 'inicio' : 'landing';
}

function App() {
  const [pantalla, setPantalla] = useState(pantallaInicial);
  const [pantallaAnterior, setPantallaAnterior] = useState('inicio');
  const [session, setSession] = useState(null);
  const [usuarioActual, setUsuarioActual] = useState(null);
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
  const [sitioSeleccionadoId, setSitioSeleccionadoId] = useState(null);
  const [sitioEnfocadoId, setSitioEnfocadoId] = useState(null);
  const { sellos, sellar, canjearQR } = useSellos(usuarioActual?.id);
  const {
    negocio,
    horarios,
    fotos,
    productos,
    registrar,
    simularAprobar,
    simularRechazar,
    actualizarHorarios,
    actualizarUbicacion,
    actualizarPerfil,
    subirLogo,
    subirFoto,
    eliminarFoto,
    agregarProducto,
    eliminarProducto,
    actividadesQR,
    crearActividadQR,
    eliminarActividadQR,
  } = useNegocio(usuarioActual?.id);
  const {
    desbloqueados,
    seleccion,
    elegir,
    nivel,
    candidatosPendientes,
    elegirDesbloqueo,
  } = useAvatarPersonalizado(usuarioActual?.id, sellos.length, localStorage.getItem('avatarElegido'));
  const [toastSitio, setToastSitio] = useState(null);
  const [sitioResaltadoPasaporte, setSitioResaltadoPasaporte] = useState(null);
  const [mostrarSubidaNivel, setMostrarSubidaNivel] = useState(false);
  const nivelPrevioRef = useRef(nivel);

  useEffect(() => {
    if (nivel > nivelPrevioRef.current) {
      setMostrarSubidaNivel(true);
    }
    nivelPrevioRef.current = nivel;
  }, [nivel]);

  useEffect(() => {
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
      iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    });
  }, []);

  // Arranque de auth: sesión inicial + suscripción a cambios de sesión.
  useEffect(() => {
    let activo = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!activo) return;
      setSession(data.session ?? null);
      setAuthInicializada(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_evento, nuevaSesion) => {
      if (!activo) return;
      setSession(nuevaSesion ?? null);
      setAuthInicializada(true);
      if (!nuevaSesion) {
        setUsuarioActual(null);
        rutaAplicadaRef.current = false;
      }
    });

    return () => {
      activo = false;
      subscription.unsubscribe();
    };
  }, []);

  // Con sesión: resolver la fila de `usuario` (crearla la primera vez) y, la
  // primera vez por sesión, enrutar según onboarding_completado. El invitado sin
  // sesión conserva el valor inicial de `pantalla` (pantallaInicial()).
  useEffect(() => {
    const userId = session?.user?.id;
    if (!userId) return;

    let activo = true;
    // Marca de "sincronizando con Supabase Auth"; el resto de setState de este
    // efecto ocurre dentro del callback async.
    // eslint-disable-next-line react-hooks/set-state-in-effect
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

  const handleSellar = async (sitio) => {
    const resultado = await sellar(sitio);
    if (resultado.exito) {
      setToastSitio(sitio);
    } else {
      alert(resultado.mensaje);
    }
  };

  const intentarSellarPorGeofencing = async (sitio) => {
    const resultado = await sellar(sitio);
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
    setPantalla(nueva);
  };

  const irAlMapaConSitio = (sitioId) => {
    setSitioEnfocadoId(sitioId);
    cambiarPantalla('mapa');
  };

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

  if (authCargando) {
    return (
      <div className="app-cargando">
        <div className="app-cargando-spinner" aria-hidden="true" />
        <p className="app-cargando-texto">Cargando…</p>
      </div>
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
    const hoy = new Date().toISOString().slice(0, 10);
    const eventoVigente = eventos
      .filter(e => e.fechaInicio <= hoy && hoy <= e.fechaFin)
      .sort((a, b) => a.fechaInicio.localeCompare(b.fechaInicio))[0];
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
        onSeleccionarEvento={setEventoActivoId}
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
          onVolver={() => cambiarPantalla('inicio')}
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
        onVerSitio={irAlMapaConSitio}
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
    return <Eventos eventos={eventos} onNavigate={cambiarPantalla} onSeleccionarEvento={setEventoActivoId} />;
  }

  if (pantalla === 'detalleEvento') {
    const evento = eventos.find(e => e.id === eventoActivoId);
    return <DetalleEvento evento={evento} onNavigate={cambiarPantalla} />;
  }

  if (pantalla === 'ranking') {
    return <Ranking sellos={sellos} onNavigate={cambiarPantalla} />;
  }

  if (pantalla === 'personalizacion') {
    return (
      <>
        <Personalizacion
          sellos={sellos}
          onNavigate={cambiarPantalla}
          desbloqueados={desbloqueados}
          seleccion={seleccion}
          elegir={elegir}
          nivel={nivel}
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
        onSimularAprobar={async () => {
          const resultado = await simularAprobar();
          if (resultado.exito) {
            cambiarPantalla('perfilNegocio');
          } else {
            window.alert(resultado.mensaje);
          }
        }}
        onSimularRechazar={async (motivo) => {
          const resultado = await simularRechazar(motivo);
          if (!resultado.exito) {
            window.alert(resultado.mensaje);
          }
        }}
        onCorregir={() => cambiarPantalla('registroNegocio')}
      />
    );
  }

  if (pantalla === 'perfilNegocio') {
    return (
      <PerfilNegocio
        negocio={negocio}
        horarios={horarios}
        fotos={fotos}
        productos={productos}
        onNavigate={cambiarPantalla}
        onActualizarHorarios={actualizarHorarios}
        onActualizarUbicacion={actualizarUbicacion}
        onActualizarPerfil={actualizarPerfil}
        onSubirLogo={(file) => subirLogo(usuarioActual?.id, file)}
        onSubirFoto={(file) => subirFoto(usuarioActual?.id, file)}
        onEliminarFoto={eliminarFoto}
        onAgregarProducto={agregarProducto}
        onEliminarProducto={eliminarProducto}
      />
    );
  }

  if (pantalla === 'generarQR') {
    return (
      <GenerarQR
        actividadesQR={actividadesQR}
        onCrearActividad={crearActividadQR}
        onEliminarActividad={eliminarActividadQR}
        onNavigate={cambiarPantalla}
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
      />
    );
  }

  return (
    <div style={{ padding: '40px', textAlign: 'center' }}>
      <h2>Pantalla: {pantalla}</h2>
      <p>En construcción...</p>
      <button
        onClick={() => cambiarPantalla('inicio')}
        style={{
          marginTop: '20px',
          padding: '10px 20px',
          background: '#1a237e',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer'
        }}
      >
        Volver al Inicio
      </button>
    </div>
  );
}

export default App;
