import { FOTOS_SITIOS } from '../data/fotos';
import './PanelSitio.css';

function IconoComoLlegar() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
      <path d="M3 11L21 3L13 21L11 13L3 11Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

function IconoGuardar() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
      <path d="M6 4h12v16l-6-4-6 4V4z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

function IconoHistoria() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
      <path
        d="M4 5c3-1.5 6-1.5 8 0v14c-2-1.5-5-1.5-8 0V5zM20 5c-3-1.5-6-1.5-8 0v14c2-1.5 5-1.5 8 0V5z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

function PanelSitio({ sitio, estaGuardado, onCerrar, onComoLlegar, onGuardar, onHistoria, onVerDetalle }) {
  if (!sitio) return null;

  const foto = FOTOS_SITIOS[String(sitio.id)];

  return (
    <div className="panel-sitio">
      <button
        type="button"
        className="panel-sitio-cerrar"
        onClick={onCerrar}
        aria-label="Cerrar"
      >
        ×
      </button>

      <h2 className="panel-sitio-nombre">{sitio.name}</h2>

      {foto && (
        <img className="panel-sitio-foto" src={foto} alt={sitio.name} />
      )}

      <div className="panel-sitio-texto">
        <span className="panel-sitio-etiqueta">Resumen histórico</span>
        <p>{sitio.desc}</p>
      </div>

      <div className="panel-sitio-acciones">
        <button
          type="button"
          className="panel-sitio-btn panel-sitio-btn-primario"
          onClick={() => onComoLlegar(sitio)}
        >
          <IconoComoLlegar />
          Cómo llegar
        </button>
        <button
          type="button"
          className={`panel-sitio-btn panel-sitio-btn-secundario ${estaGuardado ? 'activo' : ''}`}
          onClick={() => onGuardar(sitio)}
        >
          <IconoGuardar />
          {estaGuardado ? 'Guardado' : 'Guardar'}
        </button>
        <button
          type="button"
          className="panel-sitio-btn panel-sitio-btn-secundario panel-sitio-btn-ancho"
          onClick={() => onHistoria(sitio)}
        >
          <IconoHistoria />
          Historia del lugar
        </button>
        {onVerDetalle && (
          <button
            type="button"
            className="panel-sitio-btn panel-sitio-btn-secundario panel-sitio-btn-ancho"
            onClick={() => onVerDetalle(sitio)}
          >
            Ver ficha completa
          </button>
        )}
      </div>
    </div>
  );
}

export default PanelSitio;
