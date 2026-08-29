import { useState, useEffect, useRef } from 'react';
import './App.css';
import Landing from './components/Landing';
import Onboarding from './components/Onboarding';
import Login from './components/Login';
import Proposito from './components/Proposito';
import SeleccionDanzante from './components/SeleccionDanzante';
import Inicio from './components/Inicio';
import MapaRuta from './components/MapaRuta';
import MisSellos from './components/MisSellos';
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
import L from 'leaflet';

function pantallaInicial() {
  const completado = localStorage.getItem('flujoInicialCompletado');
  return completado === 'true' ? 'inicio' : 'landing';
}

function App() {
  const [pantalla, setPantalla] = useState(pantallaInicial);
  const [pantallaAnterior, setPantallaAnterior] = useState('inicio');
  const [rutaActivaId, setRutaActivaId] = useState(null);
  const [eventoActivoId, setEventoActivoId] = useState(null);
  const [sitioSeleccionadoId, setSitioSeleccionadoId] = useState(null);
  const [sitioEnfocadoId, setSitioEnfocadoId] = useState(null);
  const { sellos, sellar } = useSellos();
  const {
    negocio,
    registrar,
    simularAprobar,
    simularRechazar,
    actualizarHorarios,
    actualizarUbicacion,
    agregarProducto,
    eliminarProducto,
    generarQR,
  } = useNegocio();
  const {
    desbloqueados,
    seleccion,
    elegir,
    nivel,
    candidatosPendientes,
    elegirDesbloqueo,
  } = useAvatarPersonalizado(sellos.length);
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

  const handleSellar = (sitio) => {
    const resultado = sellar(sitio);
    if (resultado.exito) {
      setToastSitio(sitio);
    } else {
      alert(resultado.mensaje);
    }
  };

  const intentarSellarPorGeofencing = (sitio) => {
    const resultado = sellar(sitio);
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

  const handleElegirProposito = (tipo) => {
    if (tipo === 'emprendimiento') {
      if (negocio?.estado === 'activo') {
        setPantalla('perfilNegocio');
      } else if (negocio) {
        setPantalla('estadoNegocio');
      } else {
        setPantalla('registroNegocio');
      }
      return;
    }
    setPantalla('onboarding');
  };

  const handleTerminarOnboarding = () => {
    setPantalla('danzante');
  };

  const handleEscaneoQR = () => {
    const pendiente = sitios.find(
      (s) => !sellos.some((sello) => sello.sitioId === s.id)
    );
    if (!pendiente) return null;
    const resultado = sellar(pendiente);
    return resultado.exito ? pendiente : null;
  };

  const handleElegirDanzante = (avatar) => {
    localStorage.setItem('avatarElegido', avatar);
    localStorage.setItem('flujoInicialCompletado', 'true');
    setPantalla('inicio');
  };

  const handleCerrarSesionGlobal = () => {
    localStorage.removeItem('sellos');
    localStorage.removeItem('perfilUsuario');
    localStorage.removeItem('avatarElegido');
    localStorage.removeItem('flujoInicialCompletado');
    localStorage.removeItem('avatarMilestonesResueltos');
    localStorage.removeItem('avatarCandidatosPendientes');
    setPantalla('login');
  };

  if (pantalla === 'landing') {
    return <Landing onComenzar={() => setPantalla('login')} />;
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
        onEscaneoExitoso={handleEscaneoQR}
        onNavigate={cambiarPantalla}
      />
    );
  }

  if (pantalla === 'onboarding') {
    return <Onboarding onTerminar={handleTerminarOnboarding} />;
  }

  if (pantalla === 'danzante') {
    return (
      <SeleccionDanzante
        onElegir={handleElegirDanzante}
        onVolverALanding={() => setPantalla('landing')}
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

  if (pantalla === 'registroNegocio') {
    return (
      <RegistroNegocio
        onVolver={() => cambiarPantalla('proposito')}
        onRegistrar={(datos) => {
          registrar(datos);
          cambiarPantalla('registroEnviado');
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
        onSimularAprobar={() => {
          simularAprobar();
          cambiarPantalla('perfilNegocio');
        }}
        onSimularRechazar={(motivo) => simularRechazar(motivo)}
        onCorregir={() => cambiarPantalla('registroNegocio')}
      />
    );
  }

  if (pantalla === 'perfilNegocio') {
    return (
      <PerfilNegocio
        negocio={negocio}
        onNavigate={cambiarPantalla}
        onActualizarHorarios={actualizarHorarios}
        onActualizarUbicacion={actualizarUbicacion}
        onAgregarProducto={agregarProducto}
        onEliminarProducto={eliminarProducto}
      />
    );
  }

  if (pantalla === 'generarQR') {
    return (
      <GenerarQR negocio={negocio} onGenerarQR={generarQR} onNavigate={cambiarPantalla} />
    );
  }

  if (pantalla === 'menu') {
    return (
      <Menu
        onNavigate={cambiarPantalla}
        onVolver={() => cambiarPantalla(pantallaAnterior)}
        onCerrarSesion={handleCerrarSesionGlobal}
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
