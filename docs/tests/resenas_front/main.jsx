// Página de prueba: monta, según ?vista=, las pantallas de reseñas contra el Supabase simulado.
import { createRoot } from 'react-dom/client';
import '../sitio_front/idiomaPrueba.js';
import '/src/i18n.js';
import '/src/index.css';
import '/src/components/PerfilNegocio.css';
import PerfilNegocioPublico from '/src/components/PerfilNegocioPublico.jsx';
import PanelResenasNegocio from '/src/components/PanelResenasNegocio.jsx';
import PanelAdmin from '/src/components/PanelAdmin.jsx';
import LineaResenas from '/src/components/LineaResenas.jsx';

const vista = new URLSearchParams(window.location.search).get('vista');
const negocio = { id: 1, name: 'Café Colibrí', categoria: 'Cafetería', descripcion: 'Café de altura en el centro de León.', telefono: '8888-0000' };

// eslint-disable-next-line react-refresh/only-export-components
function Pantalla() {
  if (vista === 'publico') return <PerfilNegocioPublico negocio={negocio} onCerrar={() => {}} />;
  if (vista === 'vistaPrevia') return <PerfilNegocioPublico negocio={negocio} onCerrar={() => {}} vistaPrevia />;
  if (vista === 'panel') return <div className="perfilnegocio-wrapper"><div className="perfilnegocio-contenido"><PanelResenasNegocio negocioId={1} /></div></div>;
  if (vista === 'admin') return <PanelAdmin onVolver={() => {}} usuarioId="admin-1" />;
  if (vista === 'linea') return <div style={{ padding: 16 }}><LineaResenas negocioId={1} /></div>;
  return null;
}

createRoot(document.getElementById('root')).render(<Pantalla />);
