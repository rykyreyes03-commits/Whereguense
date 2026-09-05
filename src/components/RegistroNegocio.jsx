import { useState } from 'react';
import './RegistroNegocio.css';
import SeleccionUbicacion from './SeleccionUbicacion';

const CATEGORIAS = ['Cafetería', 'Restaurante', 'Arte', 'Artesanía', 'Hospedaje', 'Otro'];
const MIN_FOTOS = 3;

function RegistroNegocio({ onRegistrar, onVolver }) {
  const [nombre, setNombre] = useState('');
  const [categoria, setCategoria] = useState('');
  const [responsable, setResponsable] = useState('');
  const [cedulaRuc, setCedulaRuc] = useState('');
  const [fotos, setFotos] = useState([]);
  const [ubicacion, setUbicacion] = useState(null);
  const [mostrandoMapa, setMostrandoMapa] = useState(false);
  const [error, setError] = useState('');

  if (mostrandoMapa) {
    return (
      <SeleccionUbicacion
        ubicacionInicial={ubicacion}
        onCancelar={() => setMostrandoMapa(false)}
        onConfirmar={(punto) => {
          setUbicacion(punto);
          setMostrandoMapa(false);
        }}
      />
    );
  }

  const handleFotos = (e) => {
    const archivos = Array.from(e.target.files || []);
    setFotos(archivos);
  };

  const handleEnviar = () => {
    if (!nombre.trim()) {
      setError('Escribe el nombre de tu negocio.');
      return;
    }
    if (!categoria) {
      setError('Selecciona una categoría.');
      return;
    }
    if (!responsable.trim()) {
      setError('Escribe el nombre del responsable.');
      return;
    }
    if (fotos.length < MIN_FOTOS) {
      setError(`Sube al menos ${MIN_FOTOS} fotos (exterior, interior y productos).`);
      return;
    }
    if (!ubicacion) {
      setError('Marca la ubicación de tu negocio en el mapa.');
      return;
    }

    setError('');
    onRegistrar({
      nombre: nombre.trim(),
      categoria,
      responsable: responsable.trim(),
      cedulaRuc: cedulaRuc.trim(),
      cantidadFotos: fotos.length,
      ubicacion,
    });
  };

  return (
    <div className="registro-wrapper">
      <div className="registro-esquina"></div>

      <div className="registro-contenido">
        <button className="registro-volver" onClick={onVolver} type="button">← Volver</button>
        <h1 className="registro-titulo">Registra tu negocio</h1>

        <label className="registro-label">Nombre</label>
        <input
          className="registro-input"
          type="text"
          placeholder="Nombre del negocio"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
        />

        <label className="registro-label">Categoría</label>
        <div className="registro-categorias">
          {CATEGORIAS.map((c) => (
            <button
              key={c}
              type="button"
              className={`registro-chip ${categoria === c ? 'registro-chip-activo' : ''}`}
              onClick={() => setCategoria(c)}
            >
              {c}
            </button>
          ))}
        </div>

        <label className="registro-label">Nombre del responsable</label>
        <input
          className="registro-input"
          type="text"
          placeholder="Nombre completo"
          value={responsable}
          onChange={(e) => setResponsable(e.target.value)}
        />

        <label className="registro-label">Cédula o RUC (opcional)</label>
        <input
          className="registro-input"
          type="text"
          placeholder="Ej. 001-010101-0001A"
          value={cedulaRuc}
          onChange={(e) => setCedulaRuc(e.target.value)}
        />

        <label className="registro-label">Fotos (mínimo {MIN_FOTOS})</label>
        <p className="registro-ayuda">Exterior, interior y productos</p>
        <input
          className="registro-input-file"
          type="file"
          accept="image/*"
          multiple
          onChange={handleFotos}
        />
        {fotos.length > 0 && (
          <p className="registro-fotos-contador">{fotos.length} foto(s) seleccionada(s)</p>
        )}

        <label className="registro-label">Ubicación</label>
        <button className="registro-ubicacion-btn" onClick={() => setMostrandoMapa(true)} type="button">
          📍 {ubicacion ? 'Ubicación marcada — tocar para ajustar' : 'Marcar ubicación en el mapa'}
        </button>

        {error && <p className="registro-error">{error}</p>}

        <button className="registro-enviar" onClick={handleEnviar} type="button">
          Enviar registro
        </button>
      </div>
    </div>
  );
}

export default RegistroNegocio;
