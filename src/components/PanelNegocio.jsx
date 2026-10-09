import { useTranslation } from 'react-i18next';
import '../components/PanelSitio.css';

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

function IconoPerfil() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
      <path
        d="M4 10l1-5h14l1 5M4 10v9a1 1 0 0 0 1 1h4v-6h6v6h4a1 1 0 0 0 1-1v-9M4 10h16"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PanelNegocio({ negocio, estaGuardado, onCerrar, onComoLlegar, onGuardar, onVerPerfil }) {
  const { t } = useTranslation();
  if (!negocio) return null;

  return (
    <div className="panel-sitio">
      <button
        type="button"
        className="panel-sitio-cerrar"
        onClick={onCerrar}
        aria-label={t('comun.cerrar')}
      >
        ×
      </button>

      <h2 className="panel-sitio-nombre">{negocio.name}</h2>

      <div className="panel-sitio-texto">
        <span className="panel-sitio-etiqueta">{negocio.categoria || t('panel.negocio')}</span>
        {negocio.descripcion && <p>{negocio.descripcion}</p>}
      </div>

      <div className="panel-sitio-acciones">
        <button
          type="button"
          className="panel-sitio-btn panel-sitio-btn-primario"
          onClick={() => onComoLlegar(negocio)}
        >
          <IconoComoLlegar />
          {t('panel.comoLlegar')}
        </button>
        <button
          type="button"
          className={`panel-sitio-btn panel-sitio-btn-secundario ${estaGuardado ? 'activo' : ''}`}
          onClick={() => onGuardar(negocio)}
        >
          <IconoGuardar />
          {estaGuardado ? t('comun.guardado') : t('comun.guardar')}
        </button>
        <button
          type="button"
          className="panel-sitio-btn panel-sitio-btn-secundario panel-sitio-btn-ancho"
          onClick={() => onVerPerfil(negocio)}
        >
          <IconoPerfil />
          {t('panel.perfilNegocio')}
        </button>
      </div>
    </div>
  );
}

export default PanelNegocio;
