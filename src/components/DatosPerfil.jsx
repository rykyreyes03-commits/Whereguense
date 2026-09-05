import { useState } from 'react';
import './DatosPerfil.css';

const IDIOMAS = [
  { valor: 'es', texto: 'Español' },
  { valor: 'en', texto: 'English' },
];

function DatosPerfil({ valorInicial, onContinuar, onVolverALanding, guardando, error }) {
  const [nombre, setNombre] = useState(valorInicial?.nombre || '');
  const [pais, setPais] = useState(valorInicial?.pais || '');
  const [idioma, setIdioma] = useState(valorInicial?.idioma || 'es');
  const [errorLocal, setErrorLocal] = useState('');

  const handleContinuar = () => {
    if (!nombre.trim()) {
      setErrorLocal('Escribe un nombre de usuario.');
      return;
    }
    setErrorLocal('');
    onContinuar({ nombre: nombre.trim(), pais: pais.trim(), idioma });
  };

  return (
    <div className="datosperfil-wrapper">
      {onVolverALanding && (
        <button className="datosperfil-volver" onClick={onVolverALanding} type="button">
          ← Volver al inicio
        </button>
      )}

      <div className="datosperfil-contenido">
        <span className="datosperfil-eyebrow">CASI LISTO</span>
        <h1 className="datosperfil-titulo">Cuéntanos de ti</h1>
        <p className="datosperfil-sub">Esto nos ayuda a personalizar tu experiencia.</p>

        <label className="datosperfil-label">
          Nombre de usuario
          <input
            type="text"
            className="datosperfil-input"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            disabled={guardando}
          />
        </label>

        <label className="datosperfil-label">
          País de origen
          <input
            type="text"
            className="datosperfil-input"
            placeholder="Ej. Nicaragua"
            value={pais}
            onChange={(e) => setPais(e.target.value)}
            disabled={guardando}
          />
        </label>

        <label className="datosperfil-label">
          Idioma preferido
          <select
            className="datosperfil-input"
            value={idioma}
            onChange={(e) => setIdioma(e.target.value)}
            disabled={guardando}
          >
            {IDIOMAS.map((i) => (
              <option key={i.valor} value={i.valor}>{i.texto}</option>
            ))}
          </select>
        </label>

        {(errorLocal || error) && <p className="datosperfil-error">{errorLocal || error}</p>}

        <button
          className="datosperfil-continuar"
          onClick={handleContinuar}
          disabled={guardando}
          type="button"
        >
          {guardando ? 'Guardando…' : 'Continuar'}
        </button>
      </div>
    </div>
  );
}

export default DatosPerfil;
