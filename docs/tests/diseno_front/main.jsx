// Página de prueba: monta la ficha pública o el editor de diseño contra el Supabase simulado.
//   ?vista=ficha   la ficha a pantalla completa, como la ve el turista
//   ?vista=ficha-mapa  la ficha con el botón "Ver en el mapa" (registra en window.__llamadas: cerrar, ver)
//   ?vista=mapa[&enfocar=ID]  el mapa principal; con enfocar, como si se llegara con "Ver en el mapa"
//   ?vista=editor  la pestaña Diseño del emprendedor (guardar y subir logo/portada quedan registrados en window.__llamadas)
import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import '../sitio_front/idiomaPrueba.js';
import '/src/i18n.js';
import '/src/index.css';
import '/src/tema.css';
import '/src/tema.js';
import '/src/App.css';
import '/src/components/PerfilNegocio.css';
import PerfilNegocioPublico from '/src/components/PerfilNegocioPublico.jsx';
import EditorDiseno from '/src/components/EditorDiseno.jsx';
import MapaRuta from '/src/components/MapaRuta.jsx';
import { motivoDeRechazo } from '/src/utils/fotos.js';

const vista = new URLSearchParams(window.location.search).get('vista');
const datos = { id: 1, name: 'Café Colibrí', categoria: 'Cafetería', descripcion: 'Café de altura en el centro de León.', telefono: '87074097' };
window.__llamadas = [];

// eslint-disable-next-line react-refresh/only-export-components
function Editor() {
  const [negocio, setNegocio] = useState({ id: 1, nombre: datos.name, categoria: datos.categoria, descripcion: datos.descripcion, telefono: datos.telefono, logoUrl: null, configDiseno: window.__db.negocio.config_diseno });
  const [fotos, setFotos] = useState([]);
  return (
    <div className="perfilnegocio-wrapper">
      <div className="perfilnegocio-contenido">
        <EditorDiseno
          negocio={negocio}
          fotos={fotos}
          onSubirFoto={async (file) => {
            // mismas reglas que useNegocio (utils/fotos.js)
            const motivo = motivoDeRechazo(file, fotos.length);
            if (motivo) return { exito: false, mensaje: motivo };
            window.__llamadas.push(['foto', file.name]);
            const id = Math.max(0, ...fotos.map((f) => f.id), window.__ultimaFoto || 0) + 1;
            window.__ultimaFoto = id;
            const nueva = { id, tipo: 'exterior', orden: fotos.length, url: `https://spybqychnydgvidwjrlh.supabase.co/storage/v1/object/public/negocios/u/fotos/1_${id}.svg` };
            setFotos((prev) => [...prev, nueva]);
            return { exito: true };
          }}
          onEliminarFoto={async (id) => {
            window.__llamadas.push(['quitar', id]);
            setFotos((prev) => prev.filter((f) => f.id !== id));
            return { exito: true };
          }}
          onOrdenarFotos={async (ids) => {
            window.__llamadas.push(['ordenar', ids]);
            if (window.__db.fallaOrden) return { exito: false, mensaje: 'No se pudo guardar el orden. Intenta de nuevo.' };
            setFotos((prev) => ids.map((id, i) => ({ ...prev.find((f) => f.id === id), orden: i })));
            return { exito: true };
          }}
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

// Imita a App.jsx: el mapa vive en una pantalla; al salir se desmonta y, al volver por el menú, el negocio enfocado ya no existe.
// eslint-disable-next-line react-refresh/only-export-components
function PantallaMapa() {
  const enfocar = Number(new URLSearchParams(window.location.search).get('enfocar')) || null;
  const [pantalla, setPantalla] = useState('mapa');
  const [negocioEnfocadoId, setNegocioEnfocadoId] = useState(enfocar);
  if (pantalla !== 'mapa') {
    return (
      <div style={{ padding: 24 }}>
        <p id="otra-seccion">Pantalla de inicio</p>
        <button type="button" onClick={() => { setNegocioEnfocadoId(null); setPantalla('mapa'); }}>Ir al mapa</button>
      </div>
    );
  }
  return (
    <div className="mapa-pantalla">
      <MapaRuta
        sitios={[]}
        sellos={[]}
        onSellarAutomatico={() => {}}
        sitioEnfocadoId={null}
        negocioEnfocadoId={negocioEnfocadoId}
        onVolver={() => setPantalla('inicio')}
        usuarioId={undefined}
      />
    </div>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
function Pantalla() {
  if (vista === 'mapa') return <PantallaMapa />;
  if (vista === 'ficha-mapa') {
    return (
      <PerfilNegocioPublico
        negocio={datos}
        onCerrar={() => window.__llamadas.push(['cerrar'])}
        onVerEnMapa={(id) => window.__llamadas.push(['ver', id])}
      />
    );
  }
  if (vista === 'ficha') return <PerfilNegocioPublico negocio={datos} onCerrar={() => {}} />;
  if (vista === 'ficha-sin-descripcion') return <PerfilNegocioPublico negocio={{ ...datos, descripcion: '' }} onCerrar={() => {}} />;
  if (vista === 'editor') return <Editor />;
  return null;
}

createRoot(document.getElementById('root')).render(<Pantalla />);
