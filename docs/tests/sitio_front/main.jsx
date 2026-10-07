// Página de prueba: monta DetalleSitio con el Supabase simulado.
import { createRoot } from 'react-dom/client';
import '/src/index.css';
import DetalleSitio from '/src/components/DetalleSitio.jsx';
import PanelSitio from '/src/components/PanelSitio.jsx';
import MisSellos from '/src/components/MisSellos.jsx';
import BottomNav from '/src/components/BottomNav.jsx';
import Personalizacion from '/src/components/Personalizacion.jsx';
import Perfil from '/src/components/Perfil.jsx';
import { useNivel } from '/src/hooks/useNivel.js';
import { sitios } from '/src/data/sitios.js';

const params = new URLSearchParams(window.location.search);
const sitio = sitios.find((s) => s.id === Number(params.get('sitio') || 1));
window.__eventos = [];
const registrar = (n) => (...a) => { window.__eventos.push([n, a[0]?.id ?? null]); };

// eslint-disable-next-line react-refresh/only-export-components
function Pasaporte() {
  const sellos = [{ id: 1, sitioId: 1, fecha: '1/10/2026' }, { id: 2, sitioId: 6, fecha: '2/10/2026' }, { id: 3, sitioId: 12, fecha: '3/10/2026' }];
  const nivelInfo = useNivel('yo', sellos);
  return <MisSellos sellos={sellos} sitios={sitios} onNavigate={() => {}} nivelInfo={nivelInfo} />;
}

// eslint-disable-next-line react-refresh/only-export-components
function Pantalla() {
  if (params.get('vista') === 'pasaporte') return <Pasaporte />;
  if (params.get('vista') === 'perfil') {
    return (
      <Perfil sellos={[{ id: 1, sitioId: 1, fecha: '1/10/2026' }]} total={89} onNavigate={(p) => window.__eventos.push(['ir', p])} onCerrarSesion={() => {}}
        usuarioActual={{ id: 'yo', nombre_usuario: 'Ryky', pais: 'Nicaragua', idioma_preferido: 'es' }} onActualizarPerfil={async () => ({ exito: true })} />
    );
  }
  if (params.get('vista') === 'nav') {
    return <div style={{ height: '100vh' }}><BottomNav activo={params.get('activo')} onNavigate={(p) => window.__eventos.push(['ir', p])} /></div>;
  }
  if (params.get('vista') === 'personalizacion') {
    return (
      <Personalizacion onNavigate={(p) => window.__eventos.push(['ir', p])} desbloqueados={{ rostro: [], ropa: [], sombrero: [], gigantona: [] }}
        seleccion={{ rostro: null, ropa: null, sombrero: null, gigantona: null }} elegir={() => {}} nivel={3}
        nivelInfo={{ nivel: 3, puntosActuales: 1, puntosParaSiguiente: 6, porcentaje: 16, puntosTotales: 7 }} />
    );
  }
  if (params.get('vista') === 'panel') {
    return (
      <div style={{ position: 'relative', height: '100vh', background: '#dde' }}>
        <PanelSitio sitio={sitio} estaGuardado={false} onCerrar={registrar('cerrar')} onComoLlegar={registrar('llegar')}
          onGuardar={registrar('guardar')} onVerDetalle={registrar('detalle')} />
      </div>
    );
  }
  return (
    <DetalleSitio
      sitio={sitio}
      estaGuardado={params.get('guardado') === '1'}
      onVolver={registrar('volver')} onCerrar={registrar('cerrar')} onGuardar={registrar('guardar')}
      onHistoria={registrar('historia')} onVerRuta={registrar('ruta')} onLlegar={registrar('llegar')}
    />
  );
}
createRoot(document.getElementById('root')).render(<Pantalla />);
