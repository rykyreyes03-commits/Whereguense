import { useState } from 'react';
import Inicio from './components/Inicio';
import MapaRuta from './components/MapaRuta';
import PanelPasaporte from './components/PanelPasaporte';
import Perfil from './components/Perfil';
import RutasDestacadas from './components/RutasDestacadas';
import DetalleRuta from './components/DetalleRuta';
import Eventos from './components/Eventos';
import DetalleEvento from './components/DetalleEvento';
import Ranking from './components/Ranking';
import Tienda from './components/Tienda';
import { sitios } from './data/sitios';
import { rutas } from './data/rutas';
import { eventos } from './data/eventos';
import { useSellos } from './hooks/useSellos';
import { useEffect } from 'react';
import L from 'leaflet';

function App() {
  const [pantalla, setPantalla] = useState('inicio');
  const [rutaActivaId, setRutaActivaId] = useState(null);
  const [eventoActivoId, setEventoActivoId] = useState(null);
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

  if (pantalla === 'inicio') {
    const hoy = new Date().toISOString().slice(0, 10);
    const eventoVigente = eventos
      .filter(e => e.fechaInicio <= hoy && hoy <= e.fechaFin)
      .sort((a, b) => a.fechaInicio.localeCompare(b.fechaInicio))[0];
    return (
      <Inicio
        onNavigate={setPantalla}
        onSeleccionarRuta={setRutaActivaId}
        totalSitios={rutas[0].sitios.length}
        onSeleccionarEvento={setEventoActivoId}
        eventoDestacadoId={eventoVigente?.id}
      />
    );
  }

  if (pantalla === 'mapa') {
    return (
      <div style={{ height: '100vh', width: '100%' }}>
        <MapaRuta sitios={sitios} onSellar={handleSellar} />
        <button
          onClick={() => setPantalla('inicio')}
          style={{
            position: 'fixed',
            top: '15px',
            left: '15px',
            zIndex: 1000,
            padding: '8px 14px',
            background: '#1a237e',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer'
          }}
        >
          ← Volver
        </button>
      </div>
    );
  }

  if (pantalla === 'pasaporte') {
    return (
      <div style={{ padding: '20px' }}>
        <button
          onClick={() => setPantalla('inicio')}
          style={{
            marginBottom: '15px',
            padding: '8px 14px',
            background: '#1a237e',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer'
          }}
        >
          ← Volver
        </button>
        <PanelPasaporte sellos={sellos} total={sitios.length} />
      </div>
    );
  }

  if (pantalla === 'perfil') {
    return <Perfil sellos={sellos} total={sitios.length} onNavigate={setPantalla} />;
  }

  if (pantalla === 'rutas') {
    return <RutasDestacadas rutas={rutas} sellos={sellos} onNavigate={setPantalla} onSeleccionarRuta={setRutaActivaId} />;
  }

  if (pantalla === 'detalleRuta') {
    const ruta = rutas.find(r => r.id === rutaActivaId);
    return <DetalleRuta ruta={ruta} sellos={sellos} onNavigate={setPantalla} />;
  }

  if (pantalla === 'eventos') {
    return <Eventos eventos={eventos} onNavigate={setPantalla} onSeleccionarEvento={setEventoActivoId} />;
  }

  if (pantalla === 'detalleEvento') {
    const evento = eventos.find(e => e.id === eventoActivoId);
    return <DetalleEvento evento={evento} onNavigate={setPantalla} />;
  }

  if (pantalla === 'ranking') {
    return <Ranking sellos={sellos} onNavigate={setPantalla} />;
  }

  if (pantalla === 'tienda') {
    return <Tienda sellos={sellos} onNavigate={setPantalla} />;
  }

  return (
    <div style={{ padding: '40px', textAlign: 'center' }}>
      <h2>Pantalla: {pantalla}</h2>
      <p>En construcción...</p>
      <button
        onClick={() => setPantalla('inicio')}
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