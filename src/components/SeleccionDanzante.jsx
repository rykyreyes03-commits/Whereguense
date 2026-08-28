import './SeleccionDanzante.css';
import explorador from '../assets/flujo-inicial/explorer_transparente_final.png';
import gigantona from '../assets/flujo-inicial/gigantona.png';
function SeleccionDanzante({ onElegir }) {
  return (
    <div className="danzante-wrapper">
      <div className="danzante-esquina"></div>

      <div className="danzante-contenido">
        <h1 className="danzante-titulo">Selecciona a tu<br/>Danzante</h1>

        <div className="danzante-opciones">
          <button className="danzante-opcion" onClick={() => onElegir('enano')}>
            <img src={explorador} alt="Enano cabezón" />
            <span className="danzante-nombre">Enano cabezón</span>
          </button>
          <button className="danzante-opcion" onClick={() => onElegir('gigantona')}>
            <img src={gigantona} alt="La gigantona" />
            <span className="danzante-nombre">La gigantona</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default SeleccionDanzante;