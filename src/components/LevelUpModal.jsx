import './LevelUpModal.css';
import { ROSTROS, ROPAS, SOMBREROS, GIGANTONA } from '../data/avatarPiezas';

const POOLS = { rostro: ROSTROS, ropa: ROPAS, sombrero: SOMBREROS, gigantona: GIGANTONA };
const NOMBRES_CATEGORIA = { rostro: 'Rostro', ropa: 'Traje', sombrero: 'Sombrero', gigantona: 'Vestido' };

function LevelUpModal({ nivel, candidatos, onElegir, onCerrar }) {
  const esMilestone = Boolean(candidatos);

  return (
    <div className="levelup-fondo">
      <div className="levelup-tarjeta">
        <div className="levelup-icono">⭐</div>
        <h2 className="levelup-titulo">¡Subiste a nivel {nivel}!</h2>

        {esMilestone ? (
          <>
            <p className="levelup-subtitulo">Elige tu accesorio nuevo:</p>
            <div className="levelup-opciones">
              {candidatos.opciones.map((op) => (
                <button
                  key={`${op.categoria}-${op.id}`}
                  className="levelup-opcion"
                  onClick={() => onElegir(op)}
                  type="button"
                >
                  <img src={POOLS[op.categoria][op.id]} alt={op.id} />
                  <span>{NOMBRES_CATEGORIA[op.categoria]}</span>
                </button>
              ))}
            </div>
          </>
        ) : (
          <button className="levelup-continuar" onClick={onCerrar} type="button">
            Continuar
          </button>
        )}
      </div>
    </div>
  );
}

export default LevelUpModal;
