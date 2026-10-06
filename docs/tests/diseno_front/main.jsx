// Página de prueba: monta la ficha pública o el editor de diseño contra el Supabase simulado.
//   ?vista=ficha   la ficha a pantalla completa, como la ve el turista
//   ?vista=editor  la pestaña Diseño del emprendedor (guardar y subir logo/portada quedan registrados en window.__llamadas)
import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import '/src/index.css';
import '/src/components/PerfilNegocio.css';
import PerfilNegocioPublico from '/src/components/PerfilNegocioPublico.jsx';
import EditorDiseno from '/src/components/EditorDiseno.jsx';

const vista = new URLSearchParams(window.location.search).get('vista');
const datos = { id: 1, name: 'Café Colibrí', categoria: 'Cafetería', descripcion: 'Café de altura en el centro de León.', telefono: '87074097' };
window.__llamadas = [];

// eslint-disable-next-line react-refresh/only-export-components
function Editor() {
  const [negocio, setNegocio] = useState({ id: 1, nombre: datos.name, categoria: datos.categoria, descripcion: datos.descripcion, telefono: datos.telefono, logoUrl: null, configDiseno: window.__db.negocio.config_diseno });
  return (
    <div className="perfilnegocio-wrapper">
      <div className="perfilnegocio-contenido">
        <EditorDiseno
          negocio={negocio}
          onGuardar={async (config) => {
            window.__llamadas.push(['guardar', config]);
            if (window.__db.falla) return { exito: false, mensaje: 'No se pudo guardar el diseño. Intenta de nuevo.' };
            setNegocio((n) => ({ ...n, configDiseno: config }));
            return { exito: true };
          }}
          onSubirLogo={async (file) => {
            window.__llamadas.push(['logo', file.name, file.type]);
            return { exito: true, url: 'https://spybqychnydgvidwjrlh.supabase.co/storage/v1/object/public/negocios/u/logo_1.svg?t=1' };
          }}
          onSubirPortada={async (file) => {
            window.__llamadas.push(['portada', file.name, file.type]);
            return { exito: true, url: 'https://spybqychnydgvidwjrlh.supabase.co/storage/v1/object/public/negocios/u/portada_1.svg?t=1' };
          }}
        />
      </div>
    </div>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
function Pantalla() {
  if (vista === 'ficha') return <PerfilNegocioPublico negocio={datos} onCerrar={() => {}} />;
  if (vista === 'ficha-sin-descripcion') return <PerfilNegocioPublico negocio={{ ...datos, descripcion: '' }} onCerrar={() => {}} />;
  if (vista === 'editor') return <Editor />;
  return null;
}

createRoot(document.getElementById('root')).render(<Pantalla />);
