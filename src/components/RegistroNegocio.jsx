import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ImagePlus, MapPin } from 'lucide-react';
import './RegistroNegocio.css';
import SeleccionUbicacion from './SeleccionUbicacion';
import CampoOtro from './CampoOtro';
import { OPCIONES_CATEGORIA_NEGOCIO, OTRO_NEGOCIO, unirCategoriaNegocio } from '../utils/categoriasNegocio';

const MIN_FOTOS = 3;
const ICONOS_CATEGORIA = { Cafetería: '☕', Restaurante: '🍽️', Arte: '🎨', Artesanía: '🧶', Hospedaje: '🏨', Otro: '➕' };

function RegistroNegocio({ onRegistrar, onVolver }) {
  const [nombre, setNombre] = useState('');
  const [categoria, setCategoria] = useState('');
  const [categoriaOtro, setCategoriaOtro] = useState('');
  const [responsable, setResponsable] = useState('');
  const [cedulaRuc, setCedulaRuc] = useState('');
  const [fotos, setFotos] = useState([]);
  const [ubicacion, setUbicacion] = useState(null);
  const [mostrandoMapa, setMostrandoMapa] = useState(false);
  const [error, setError] = useState('');
  const [soltarSobre, setSoltarSobre] = useState(false);
  const fotosRef = useRef(null);
  const miniaturas = useMemo(() => fotos.map((f) => URL.createObjectURL(f)), [fotos]);
  useEffect(() => () => miniaturas.forEach((u) => URL.revokeObjectURL(u)), [miniaturas]);

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
    if (categoria === OTRO_NEGOCIO && !categoriaOtro.trim()) {
      setError('Escribe cuál es la categoría de tu negocio.');
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
      categoria: unirCategoriaNegocio(categoria, categoriaOtro),
      responsable: responsable.trim(),
      cedulaRuc: cedulaRuc.trim(),
      cantidadFotos: fotos.length,
      ubicacion,
    });
  };

  return (
    <div className="registro-wrapper">
      <header className="registro-header">
        <div className="registro-esquina"></div>
        <button className="registro-volver" onClick={onVolver} type="button">
          <ArrowLeft size={16} strokeWidth={2.2} aria-hidden="true" /> Volver
        </button>
        <h1 className="registro-titulo">Registra tu negocio</h1>
        <p className="registro-subtitulo">Forma parte de la red de negocios locales de WhereGüense</p>
      </header>

      <div className="registro-contenido">
        <div className="registro-seccion">
          <label className="registro-label" htmlFor="registro-nombre">Nombre</label>
          <input
            id="registro-nombre"
            className="registro-input"
            type="text"
            placeholder="Nombre del negocio"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
          />
        </div>

        <div className="registro-seccion">
          <span className="registro-label">Categoría</span>
          <div className="registro-categorias">
            {OPCIONES_CATEGORIA_NEGOCIO.map((c) => (
              <button
                key={c}
                type="button"
                className={`registro-chip ${categoria === c ? 'registro-chip-activo' : ''}`}
                aria-pressed={categoria === c}
                onClick={() => setCategoria(c)}
              >
                <span aria-hidden="true">{ICONOS_CATEGORIA[c]}</span> {c}
              </button>
            ))}
          </div>
          {categoria === OTRO_NEGOCIO && (
            <CampoOtro id="registro-categoria-otro" value={categoriaOtro} onChange={setCategoriaOtro} claseInput="registro-input" placeholder="Ej. Panadería, Librería…" />
          )}
        </div>

        <div className="registro-seccion">
          <label className="registro-label" htmlFor="registro-responsable">Nombre del responsable</label>
          <input
            id="registro-responsable"
            className="registro-input"
            type="text"
            placeholder="Nombre completo"
            value={responsable}
            onChange={(e) => setResponsable(e.target.value)}
          />
          <label className="registro-label registro-label--segundo" htmlFor="registro-cedula">Cédula o RUC (opcional)</label>
          <input
            id="registro-cedula"
            className="registro-input"
            type="text"
            placeholder="Ej. 001-010101-0001A"
            value={cedulaRuc}
            onChange={(e) => setCedulaRuc(e.target.value)}
          />
        </div>

        <div className="registro-seccion">
          <span className="registro-label">Fotos (mínimo {MIN_FOTOS})</span>
          <p className="registro-ayuda">Exterior, interior y productos</p>
          <input
            ref={fotosRef}
            className="registro-input-file"
            type="file"
            accept="image/*"
            multiple
            onChange={handleFotos}
            tabIndex={-1}
            aria-hidden="true"
          />
          <button
            type="button"
            className={`registro-soltar ${soltarSobre ? 'sobre' : ''}`}
            onClick={() => fotosRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setSoltarSobre(true); }}
            onDragLeave={() => setSoltarSobre(false)}
            onDrop={(e) => {
              e.preventDefault();
              setSoltarSobre(false);
              const archivos = Array.from(e.dataTransfer.files || []).filter((f) => f.type.startsWith('image/'));
              if (archivos.length) setFotos(archivos);
            }}
          >
            <ImagePlus size={20} strokeWidth={1.8} aria-hidden="true" />
            {fotos.length > 0 ? 'Cambiar fotos' : 'Agregar fotos'}
          </button>
          {fotos.length > 0 && (
            <>
              <ul className="registro-miniaturas">
                {miniaturas.map((url, i) => (
                  <li key={url}><img src={url} alt={`Foto ${i + 1}`} /></li>
                ))}
              </ul>
              <p className="registro-fotos-contador">{fotos.length} foto(s) seleccionada(s)</p>
            </>
          )}
        </div>

        <div className="registro-seccion">
          <span className="registro-label">Ubicación</span>
          <button className="registro-ubicacion-btn" onClick={() => setMostrandoMapa(true)} type="button">
            <MapPin size={20} strokeWidth={2} aria-hidden="true" /> {ubicacion ? 'Ubicación marcada — tocar para ajustar' : 'Marcar ubicación en el mapa'}
          </button>
        </div>

        {error && <p className="registro-error">{error}</p>}

        <button className="registro-enviar" onClick={handleEnviar} type="button">
          Enviar registro
        </button>
      </div>
    </div>
  );
}

export default RegistroNegocio;
