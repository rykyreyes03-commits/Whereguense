import '../components/HistoriaSitio.css';
import './PerfilNegocioPublico.css';

function PerfilNegocioPublico({ negocio, onCerrar }) {
  if (!negocio) return null;

  return (
    <div className="historia-sitio">
      <div className="historia-sitio-hero">
        <button
          type="button"
          className="historia-sitio-cerrar"
          onClick={onCerrar}
          aria-label="Cerrar"
        >
          ×
        </button>
        <h2 className="historia-sitio-nombre">{negocio.name}</h2>
        <p className="perfilpublico-categoria">{negocio.categoria}</p>
      </div>

      <div className="historia-sitio-contenido">
        <p className="historia-sitio-texto">
          {negocio.descripcion || 'Este negocio aún no agregó una descripción.'}
        </p>
        {negocio.telefono && (
          <p className="perfilpublico-telefono">📞 {negocio.telefono}</p>
        )}
        <p className="perfilpublico-nota">
          Horarios, fotos y productos próximamente.
        </p>
      </div>
    </div>
  );
}

export default PerfilNegocioPublico;
