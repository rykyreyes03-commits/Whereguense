// Página de prueba: monta DetalleSitio con el Supabase simulado.
import { createRoot } from 'react-dom/client';
import '/src/index.css';
import DetalleSitio from '/src/components/DetalleSitio.jsx';
import PanelSitio from '/src/components/PanelSitio.jsx';
import { sitios } from '/src/data/sitios.js';

const params = new URLSearchParams(window.location.search);
const sitio = sitios.find((s) => s.id === Number(params.get('sitio') || 1));
window.__eventos = [];
const registrar = (n) => (...a) => { window.__eventos.push([n, a[0]?.id ?? null]); };

// eslint-disable-next-line react-refresh/only-export-components
function Pantalla() {
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
