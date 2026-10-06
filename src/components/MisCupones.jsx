import { useEffect, useState } from 'react';
import { Ticket, ScanLine, ChevronDown } from 'lucide-react';
import './MisCupones.css';
import './CanjearCupon.css';
import './TarjetaCupon.css';
import TopBar from './TopBar';
import BottomNav from './BottomNav';
import { estadoCupon } from '../utils/cupones';
import { useAhora } from '../hooks/useAhora';

function formatearFecha(iso) {
  return new Date(iso).toLocaleDateString('es-NI', { day: 'numeric', month: 'short', year: 'numeric' });
}

// "Mis cupones" (en el pasaporte): los cupones que el turista puede usar, con negocio, descripción,
// porcentaje y hasta cuándo valen. Tocar uno explica el siguiente paso: ir al negocio y escanear su QR
// de canje. Los vencidos y los ya usados salen de la lista principal y quedan en "Vencidos y usados"
// (plegado). Cada minuto se vuelve a evaluar: un cupón que vence con la pantalla abierta pasa solo allá.
function MisCupones({ cupones, cargando, onRecargar, onNavigate }) {
  const [abiertoId, setAbiertoId] = useState(null);
  const [otrosAbiertos, setOtrosAbiertos] = useState(false);
  const ahora = useAhora();

  // Siempre al día al entrar (se pudo usar un cupón o obtener otro desde otra pantalla).
  useEffect(() => {
    onRecargar?.();
  }, [onRecargar]);

  const conEstado = cupones.map((cupon) => ({ cupon, estado: estadoCupon(cupon, ahora) }));
  const disponibles = conEstado.filter(({ estado }) => estado.clave === 'disponible');
  const otros = conEstado.filter(({ estado }) => estado.clave !== 'disponible');

  const renderCupon = ({ cupon, estado }) => {
    const abierto = abiertoId === cupon.id;
    const usable = estado.clave === 'disponible';
    // Solo un cupón que se puede usar es un botón (explica el siguiente paso); los vencidos y usados son solo lectura.
    const contenido = (
      <>
        <span className="canjear-cupon-porcentaje">{cupon.descuento_porcentaje}%</span>
        <span className="canjear-cupon-texto">
          <span className="miscupones-negocio">{cupon.nombre_negocio}</span>
          <strong>{cupon.descripcion}</strong>
          <span className="canjear-cupon-estado">{estado.texto}</span>
          {cupon.fecha_expiracion && usable && (
            <span className="miscupones-vence">Vence el {formatearFecha(cupon.fecha_expiracion)}</span>
          )}
        </span>
      </>
    );
    return (
      <li key={cupon.id}>
        {usable ? (
          <button
            type="button"
            className={`canjear-cupon canjear-cupon--${estado.clave}`}
            onClick={() => setAbiertoId(abierto ? null : cupon.id)}
            aria-expanded={abierto}
          >
            {contenido}
          </button>
        ) : (
          <div className={`canjear-cupon canjear-cupon--${estado.clave} tarjeta-cupon`}>{contenido}</div>
        )}

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
  };

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
          <>
            {disponibles.length > 0 ? (
              <ul className="miscupones-lista">{disponibles.map(renderCupon)}</ul>
            ) : (
              <div className="miscupones-vacio">
                <span className="miscupones-vacio-icono" aria-hidden="true"><Ticket size={30} strokeWidth={1.8} /></span>
                <p>No tienes cupones disponibles ahora. Escanea el QR de un cupón en un negocio para obtener uno.</p>
                <button className="canjear-btn" type="button" onClick={() => onNavigate?.('escanearCupon')}>
                  <ScanLine size={18} strokeWidth={2} aria-hidden="true" /> Escanear cupón
                </button>
              </div>
            )}

            {otros.length > 0 && (
              <div className="miscupones-otros">
                <button
                  type="button"
                  className="miscupones-otros-toggle"
                  aria-expanded={otrosAbiertos}
                  aria-controls={otrosAbiertos ? 'cupones-vencidos-y-usados' : undefined}
                  onClick={() => setOtrosAbiertos((v) => !v)}
                >
                  Vencidos y usados ({otros.length})
                  <ChevronDown size={16} strokeWidth={2.2} aria-hidden="true" className={otrosAbiertos ? 'girada' : ''} />
                </button>
                {otrosAbiertos && <ul className="miscupones-lista" id="cupones-vencidos-y-usados">{otros.map(renderCupon)}</ul>}
              </div>
            )}
          </>
        )}
      </div>

      <BottomNav activo="pasaporte" onNavigate={onNavigate} />
    </div>
  );
}

export default MisCupones;
