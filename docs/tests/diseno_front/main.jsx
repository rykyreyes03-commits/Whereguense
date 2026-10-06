// Página de prueba: monta la ficha pública o el editor de diseño contra el Supabase simulado.
//   ?vista=ficha   la ficha a pantalla completa, como la ve el turista
//   ?vista=editor  la pestaña Diseño del emprendedor (guardar y subir portada quedan registrados en window.__llamadas)
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
          onSubirPortada={async (file) => {
            window.__llamadas.push(['portada', file.name, file.type]);
            const svg = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='600' height='300'><rect width='600' height='300' fill='%23d98c3a'/><circle cx='300' cy='150' r='80' fill='%23fff3d6'/></svg>";
            return { exito: true, url: svg };
          }}
        />
      </div>
    </div>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
function Pantalla() {
  if (vista === 'ficha') return <PerfilNegocioPublico negocio={datos} onCerrar={() => {}} />;
  if (vista === 'editor') return <Editor />;
  return null;
}

createRoot(document.getElementById('root')).render(<Pantalla />);
