import './Avatar.css';
import { ROSTROS, ROPAS, SOMBREROS, GIGANTONA } from '../data/avatarPiezas';

function Avatar({ tipo, seleccion, tamano = 'grande' }) {
  if (tipo === 'gigantona') {
    const src = GIGANTONA[seleccion.gigantona];
    return (
      <div className={`avatar-capas avatar-${tamano}`}>
        {src && <img src={src} alt="Tu Gigantona" className="avatar-capa-ropa" />}
      </div>
    );
  }

  return (
    <div className={`avatar-capas avatar-${tamano}`}>
      {ROPAS[seleccion.ropa] && <img src={ROPAS[seleccion.ropa]} alt="" className="avatar-capa-ropa" />}
      {ROSTROS[seleccion.rostro] && <img src={ROSTROS[seleccion.rostro]} alt="" className="avatar-capa-rostro" />}
      {seleccion.sombrero && SOMBREROS[seleccion.sombrero] && (
        <img src={SOMBREROS[seleccion.sombrero]} alt="" className="avatar-capa-sombrero" />
      )}
    </div>
  );
}

export default Avatar;