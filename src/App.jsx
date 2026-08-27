import { useState, useEffect } from 'react';
import './App.css';
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
import Tienda from './components/Tienda';
import Menu from './components/Menu';
import TopBar from './components/TopBar';
import BottomNav from './components/BottomNav';
import { sitios } from './data/sitios';
import { rutas } from './data/rutas';
import { eventos } from './data/eventos';
import { useSellos } from './hooks/useSellos';
import L from 'leaflet';

function pantallaInicial() {
  const completado = localStorage.getItem('flujoInicialCompletado');
  if (completado === 'true') return 'inicio';

  const onboardingVisto = localStorage.getItem('onboardingVisto');
  return onboardingVisto === 'true' ? 'login' : 'onboarding';
}

function App() {
  const [pantalla, setPantalla] = useState(pantallaInicial);
  const [pantallaAnterior, setPantallaAnterior] = useState('inicio');
  const [rutaActivaId, setRutaActivaId] = useState(null);
  const [eventoActivoId, setEventoActivoId] = useState(null);
  const [sitioSeleccionadoId, setSitioSeleccionadoId] = useState(null);
  const [sitioEnfocadoId, setSitioEnfocadoId] = useState(null);
  const { sellos, sellar } = useSellos();

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
    alert(resultado.mensaje);
  };

  const cambiarPantalla = (nueva) => {
    if (nueva === 'menu') {
      setPantallaAnterior(pantalla);
    }
    setPantalla(nueva);
  };

  const handleTerminarOnboarding = () => {
    localStorage.setItem('onboardingVisto', 'true');
    setPantalla('login');
  };

  const handleElegirProposito = (tipo) => {
    if (tipo === 'emprendimiento') {
      alert('El registro de negocios todavía no está construido — por ahora, elegí "Turismo" para seguir. 🚧');
      return;
    }
    setPantalla('danzante');
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
    setPantalla('login');
  };

  if (pantalla === 'onboarding') {
    return <Onboarding onTerminar={handleTerminarOnboarding} />;
  }

  if (pantalla === 'login') {
    return <Login onIniciarComoInvitado={() => setPantalla('proposito')} />;
  }

  if (pantalla === 'proposito') {
    return <Proposito onElegir={handleElegirProposito} />;
  }

  if (pantalla === 'danzante') {
    return <SeleccionDanzante onElegir={handleElegirDanzante} />;
  }

  if (pantalla === 'inicio') {
    const hoy = new Date().toISOString().slice(0, 10);
    const eventoVigente = eventos
      .filter(e => e.fechaInicio <= hoy && hoy <= e.fechaFin)
      .sort((a, b) => a.fechaInicio.localeCompare(b.fechaInicio))[0];
    return (
      <Inicio
        onNavigate={cambiarPantalla}
        onSeleccionarRuta={setRutaActivaId}
        totalSitios={rutas[0].sitios.length}
        onSeleccionarEvento={setEventoActivoId}
        eventoDestacadoId={eventoVigente?.id}
      />
    );
  }

  if (pantalla === 'mapa') {
    return (
      <div className="mapa-pantalla">
        <TopBar onMenuClick={() => cambiarPantalla('menu')} />
        <MapaRuta sitios={sitios} onSellar={handleSellar} sitioEnfocadoId={sitioEnfocadoId} />
        <BottomNav activo="mapa" onNavigate={cambiarPantalla} />
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

  if (pantalla === 'tienda') {
    return <Tienda sellos={sellos} onNavigate={cambiarPantalla} />;
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