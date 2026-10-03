import { useEffect, useState } from 'react';
import { Ticket, ScanLine } from 'lucide-react';
import './MisCupones.css';
import './CanjearCupon.css';
import TopBar from './TopBar';
import BottomNav from './BottomNav';
import { estadoCupon } from '../utils/cupones';

function formatearFecha(iso) {
  return new Date(iso).toLocaleDateString('es-NI', { day: 'numeric', month: 'short', year: 'numeric' });
}

// "Mis cupones" (en el pasaporte): los cupones que el turista obtuvo, con negocio, descripción,
// porcentaje y si siguen disponibles. Tocar uno disponible explica el siguiente paso: ir al
// negocio y escanear su QR de canje.
function MisCupones({ cupones, cargando, onRecargar, onNavigate }) {
  const [abiertoId, setAbiertoId] = useState(null);

  // Siempre al día al entrar (se pudo usar un cupón o obtener otro desde otra pantalla).
  useEffect(() => {
    onRecargar?.();
  }, [onRecargar]);

  return (
    <div className="miscupones-wrapper">
      <TopBar title="Mis cupones" onBack={() => onNavigate?.('pasaporte')} />

      <div className="miscupones-contenido">
        {cargando ? (
          <p className="miscupones-estado">Cargando…</p>
        ) : cupones.length === 0 ? (
          <div className="miscupones-vacio">
            <span className="miscupones-vacio-icono" aria-hidden="true"><Ticket size={30} strokeWidth={1.8} /></span>
            <p>Aún no tienes cupones. Escanea el QR de un cupón en un negocio para obtenerlo.</p>
            <button className="canjear-btn" type="button" onClick={() => onNavigate?.('escanearCupon')}>
              <ScanLine size={18} strokeWidth={2} aria-hidden="true" /> Escanear cupón
            </button>
          </div>
        ) : (
          <ul className="miscupones-lista">
            {cupones.map((cupon) => {
              const estado = estadoCupon(cupon);
              const abierto = abiertoId === cupon.id;
              const usable = estado.clave === 'disponible';
              return (
                <li key={cupon.id}>
                  <button
                    type="button"
                    className={`canjear-cupon canjear-cupon--${estado.clave}`}
                    onClick={() => usable && setAbiertoId(abierto ? null : cupon.id)}
                    aria-expanded={usable ? abierto : undefined}
                  >
                    <span className="canjear-cupon-porcentaje">{cupon.descuento_porcentaje}%</span>
                    <span className="canjear-cupon-texto">
                      <span className="miscupones-negocio">{cupon.nombre_negocio}</span>
                      <strong>{cupon.descripcion}</strong>
                      <span className="canjear-cupon-estado">{estado.texto}</span>
                      {cupon.fecha_expiracion && estado.clave === 'disponible' && (
                        <span className="miscupones-vence">Vence el {formatearFecha(cupon.fecha_expiracion)}</span>
                      )}
                    </span>
                  </button>

                  {abierto && (
                    <div className="miscupones-paso">
                      <p>
                        Para usarlo, ve a <strong>{cupon.nombre_negocio}</strong> y escanea su QR de canje. Ahí elegirás este cupón.
                      </p>
                      <button className="canjear-btn" type="button" onClick={() => onNavigate?.('escanearCupon')}>
                        <ScanLine size={18} strokeWidth={2} aria-hidden="true" /> Escanear QR de canje
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <BottomNav activo="pasaporte" onNavigate={onNavigate} />
    </div>
  );
}

export default MisCupones;
