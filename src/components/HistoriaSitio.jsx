import guiaCabezon from '../assets/personajes/guiacabezon_dariana.png';
import guiaGigantona from '../assets/personajes/guiagigantona_dariana.png';
import './HistoriaSitio.css';

function partirEnParrafos(texto) {
  const oraciones = texto.split(/(?<=[.!?])\s+/);
  const mitad = Math.ceil(oraciones.length / 2);
  return [
    oraciones.slice(0, mitad).join(' '),
    oraciones.slice(mitad).join(' '),
  ].filter(Boolean);
}

function HistoriaSitio({ sitio, onCerrar }) {
  if (!sitio) return null;

  const avatarElegido = localStorage.getItem('avatarElegido');
  const imagenGuia = avatarElegido === 'gigantona' ? guiaGigantona : guiaCabezon;
  const parrafos = partirEnParrafos(sitio.historia);

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
        <h2 className="historia-sitio-nombre">{sitio.name}</h2>
        <div className="historia-sitio-guia-fondo">
          <img
            className="historia-sitio-guia"
            src={imagenGuia}
            alt=""
            aria-hidden="true"
          />
        </div>
      </div>

      <div className="historia-sitio-contenido">
        {parrafos.map((parrafo, i) => (
          <p key={i} className="historia-sitio-texto">{parrafo}</p>
        ))}
      </div>
    </div>
  );
}

export default HistoriaSitio;
