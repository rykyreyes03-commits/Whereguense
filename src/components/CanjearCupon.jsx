import { useState } from 'react';
import { Ticket, CircleCheck, CircleX } from 'lucide-react';
import './CanjearCupon.css';
import TopBar from './TopBar';
import { estadoCupon } from '../utils/cupones';

// Después de escanear el QR de canje de un negocio: sus cupones del turista para elegir cuál
// usar. Tocar uno llama a usar_cupon con ese id y el token de canje ya leído. Los que no están
// disponibles también se pueden tocar: la base responde con su mensaje (ya usado, vencido…),
// que además cubre una lista desactualizada.
function CanjearCupon({ canje, cupones, onUsarCupon, onVolver, onNavigate }) {
  const [procesando, setProcesando] = useState(false);
  const [resultado, setResultado] = useState(null); // { exito, mensaje, cupon }

  const delNegocio = cupones.filter((c) => c.negocio_id === canje.negocioId);
  const hayDisponibles = delNegocio.some((c) => c.disponible && c.estado === 'obtenido');

  const handleElegir = async (cupon) => {
    if (procesando) return;
    if (cupon.disponible && cupon.estado === 'obtenido') {
      const confirmado = window.confirm(
        `¿Usar ahora "${cupon.descripcion}" (${cupon.descuento_porcentaje}%)? No se puede deshacer.`
      );
      if (!confirmado) return;
    }
    setProcesando(true);
    const res = await onUsarCupon(cupon.id, canje.token);
    setProcesando(false);
    setResultado({ ...res, cupon });
  };

  if (resultado) {
    return (
      <div className="canjear-wrapper">
        <TopBar title="Usar un cupón" onBack={onVolver} />
        <div className="canjear-contenido">
          <div className={`canjear-resultado ${resultado.exito ? 'canjear-resultado--exito' : 'canjear-resultado--error'}`}>
            <span className="canjear-resultado-icono" aria-hidden="true">
              {resultado.exito ? <CircleCheck size={44} strokeWidth={1.8} /> : <CircleX size={44} strokeWidth={1.8} />}
            </span>
            <h1>{resultado.exito ? '¡Cupón usado!' : 'No se pudo usar'}</h1>
            <p className="canjear-resultado-mensaje">{resultado.mensaje}</p>
            {resultado.exito && (
              <div className="canjear-resultado-cupon">
                <strong>{resultado.descuento_porcentaje}% de descuento</strong>
                <span>{resultado.descripcion}</span>
                <span>{resultado.nombre_negocio}</span>
              </div>
            )}
            {resultado.exito && <p className="canjear-aviso">Muestra esta pantalla en el negocio.</p>}
          </div>
          <button className="canjear-btn" type="button" onClick={() => setResultado(null)}>
            {resultado.exito ? 'Ver mis cupones de este negocio' : 'Volver a la lista'}
          </button>
          <button className="canjear-btn canjear-btn--secundario" type="button" onClick={() => onNavigate?.('misCupones')}>
            Ir a mis cupones
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="canjear-wrapper">
      <TopBar title="Usar un cupón" onBack={onVolver} />
      <div className="canjear-contenido">
        <h1 className="canjear-titulo">{canje.nombreNegocio}</h1>
        <p className="canjear-sub">
          {delNegocio.length === 0
            ? 'Todavía no tienes cupones de este negocio.'
            : hayDisponibles
              ? 'Elige el cupón que quieres usar ahora.'
              : 'No tienes cupones disponibles en este negocio.'}
        </p>

        {delNegocio.length > 0 ? (
          <ul className="canjear-lista">
            {delNegocio.map((cupon) => {
              const estado = estadoCupon(cupon);
              return (
                <li key={cupon.id}>
                  <button
                    type="button"
                    className={`canjear-cupon canjear-cupon--${estado.clave}`}
                    onClick={() => handleElegir(cupon)}
                    disabled={procesando}
                  >
                    <span className="canjear-cupon-porcentaje">{cupon.descuento_porcentaje}%</span>
                    <span className="canjear-cupon-texto">
                      <strong>{cupon.descripcion}</strong>
                      <span className="canjear-cupon-estado">{estado.texto}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <button className="canjear-btn" type="button" onClick={onVolver}>
            <Ticket size={18} strokeWidth={2} aria-hidden="true" /> Escanear un cupón
          </button>
        )}
      </div>
    </div>
  );
}

export default CanjearCupon;
