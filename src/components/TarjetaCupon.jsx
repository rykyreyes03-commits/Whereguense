import './CanjearCupon.css';
import './TarjetaCupon.css';
import { estadoDeCupon } from '../utils/cupones';
import { rangoEscrito, hoyISO } from '../utils/eventos';

// El cupón tal como lo ve el turista en "Mis cupones" (mismo diseño que CanjearCupon y MisCupones), sin ser un botón:
// porcentaje, negocio, descripción, estado y, si lo tiene y sigue disponible, hasta cuándo vence.
//   cupon: fila de mis_cupones_negocio ({ descripcion, descuento_porcentaje, fecha_expiracion, activo }).
function TarjetaCupon({ cupon, negocio }) {
  const estado = estadoDeCupon(cupon);
  return (
    <div className={`canjear-cupon canjear-cupon--${estado.clave} tarjeta-cupon`}>
      <span className="canjear-cupon-porcentaje">{cupon.descuento_porcentaje}%</span>
      <span className="canjear-cupon-texto">
        {negocio && <span className="tarjeta-cupon-negocio">{negocio}</span>}
        <strong>{cupon.descripcion}</strong>
        <span className="canjear-cupon-estado">{estado.texto}</span>
        {cupon.fecha_expiracion && estado.clave === 'disponible' && (
          <span className="tarjeta-cupon-vence">Vence el {rangoEscrito(hoyISO(new Date(cupon.fecha_expiracion)))}</span>
        )}
      </span>
    </div>
  );
}

export default TarjetaCupon;
