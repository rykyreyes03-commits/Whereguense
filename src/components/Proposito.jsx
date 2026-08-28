import './Proposito.css';
import iconoTurismo from '../assets/flujo-inicial/tourism_hd_choke.png';
import iconoEmprendimiento from '../assets/flujo-inicial/entrepreneurship_hd_choke.png';

function Proposito({ onElegir }) {
  return (
    <div className="proposito-wrapper">
      <div className="proposito-esquina"></div>

      <div className="proposito-contenido">
        <h1 className="proposito-titulo">¿Qué buscas?</h1>

        <div className="proposito-opciones">
          <button className="proposito-opcion" onClick={() => onElegir('turismo')}>
            <img src={iconoTurismo} alt="" />
            <span className="proposito-pill">Turismo</span>
          </button>
          <button className="proposito-opcion" onClick={() => onElegir('emprendimiento')}>
            <img src={iconoEmprendimiento} alt="" />
            <span className="proposito-pill">Emprendimiento</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default Proposito;