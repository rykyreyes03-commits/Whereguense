import { useId, useRef, useState } from 'react';
import { Eye, Pencil, Trash2, QrCode, Users, Power, Lock } from 'lucide-react';
import './DetalleActividad.css';
import './CuponesNegocio.css';
import './DetalleCupon.css';
import PantallaFormulario from './PantallaFormulario';
import TarjetaCupon from './TarjetaCupon';
import BloqueQR from './BloqueQR';
import { valorQRCupon } from '../utils/qr';
import { rangoEscrito, hoyISO, cuponVencido } from '../utils/eventos';
import { useAhora } from '../hooks/useAhora';

// Pantalla de un cupón del negocio: arriba "Así lo ve el turista" con su tarjeta, los números del cupón y las
// acciones. Las reglas de la base se explican donde importan: no se puede eliminar un cupón que ya obtuvieron
// (el botón se queda, apagado y con la razón) y desactivarlo no quita el cupón a quien ya lo tiene.
//   otorgados: filas de mis_cupones_otorgados de este cupón (o null mientras se cargan).
function DetalleCupon({
  cupon,
  negocio = '',
  otorgados = null,
  onVolver,
  onEditar,
  onCambiarActivo,
  onEliminar,
  onVerOtorgados,
  aviso = '',
}) {
  const idAviso = useId();
  const ahora = useAhora(); // si el cupón vence con la pantalla abierta, pasa a "Venció" sin recargar
  const [verQR, setVerQR] = useState(false);
  const [verOtorgados, setVerOtorgados] = useState(false);
  const [cambiando, setCambiando] = useState(false);

  const obtenidos = cupon.obtenidos || 0;
  const puedeEliminar = obtenidos === 0;
  const vencido = cuponVencido(cupon, ahora);
  const dia = (valor) => rangoEscrito(hoyISO(new Date(valor)));

  const alternarOtorgados = async () => {
    const abrir = !verOtorgados;
    setVerOtorgados(abrir);
    if (abrir) await onVerOtorgados?.(); // siempre al día: los turistas lo obtienen y usan todo el tiempo
  };

  const cambiandoRef = useRef(false);
  const handleCambiarActivo = async () => {
    if (cambiandoRef.current) return; // un segundo toque antes de que React pinte no manda otra petición
    cambiandoRef.current = true;
    setCambiando(true);
    try {
      await onCambiarActivo?.(cupon);
    } finally {
      cambiandoRef.current = false;
      setCambiando(false);
    }
  };

  return (
    <>
      <PantallaFormulario titulo="Tu cupón" onVolver={onVolver} sinRelleno>
        <p className="detact-franja">
          <Eye size={18} strokeWidth={2} aria-hidden="true" /> Así lo ve el turista
        </p>

        {aviso && <p className="detact-aviso detact-aviso--ok" role="status">{aviso}</p>}

        <div className="detcup-cuerpo">
          <TarjetaCupon cupon={cupon} negocio={negocio} />

          <ul className="detcup-datos" aria-label="Números del cupón">
            <li><strong>{obtenidos}</strong> {cupon.limite_total ? `de ${cupon.limite_total} ` : ''}obtenido{obtenidos === 1 ? '' : 's'}</li>
            <li><strong>{cupon.usados || 0}</strong> usado{cupon.usados === 1 ? '' : 's'}</li>
            <li>{cupon.fecha_expiracion ? `${vencido ? 'Venció' : 'Vence'} el ${dia(cupon.fecha_expiracion)}` : 'No vence'}</li>
          </ul>

          {!puedeEliminar && (
            <p className="detact-aviso detact-aviso--sellos detcup-aviso" id={idAviso}>
              <Lock size={18} strokeWidth={2} aria-hidden="true" />
              <span>Ya lo {obtenidos === 1 ? 'obtuvo 1 persona' : `obtuvieron ${obtenidos} personas`}. Puedes desactivarlo, pero no eliminarlo.</span>
            </p>
          )}

          <div className="detcup-acciones">
            {onEditar && (
              <button type="button" className="detcup-accion" onClick={onEditar}>
                <Pencil size={18} strokeWidth={2} aria-hidden="true" /> Editar
              </button>
            )}

            <div className="detcup-grupo">
              <button type="button" className="detcup-accion" onClick={handleCambiarActivo} aria-disabled={cambiando}>
                <Power size={18} strokeWidth={2} aria-hidden="true" /> {cupon.activo ? 'Desactivar cupón' : 'Activar cupón'}
              </button>
              <p className="detcup-nota">
                {cupon.activo
                  ? 'Desactivarlo evita que se obtengan más. Quien ya lo tiene lo puede usar hasta que venza.'
                  : 'Está desactivado: nadie puede obtenerlo. Actívalo para que vuelva a estar disponible.'}
              </p>
            </div>

            <button type="button" className="detcup-accion" onClick={() => setVerQR(true)}>
              <QrCode size={18} strokeWidth={2} aria-hidden="true" /> Ver QR
            </button>

            <div className="detcup-grupo">
              <button type="button" className="detcup-accion" onClick={alternarOtorgados} aria-expanded={verOtorgados}>
                <Users size={18} strokeWidth={2} aria-hidden="true" /> ¿Quién lo tiene?
              </button>
              {verOtorgados && (
                otorgados === null ? (
                  <p className="detcup-nota">Cargando…</p>
                ) : otorgados.length === 0 ? (
                  <p className="detcup-nota">Todavía nadie tiene este cupón.</p>
                ) : (
                  <ul className="cupon-otorgados">
                    {otorgados.map((o) => (
                      <li key={o.id}>
                        <span className="cupon-otorgado-nombre">{o.turista}</span>
                        <span className={`cupon-otorgado-estado ${o.estado === 'usado' ? 'cupon-otorgado-estado--usado' : ''}`}>
                          {o.estado === 'usado' ? `Usado el ${dia(o.fecha_uso)}` : 'Sin usar'}
                        </span>
                      </li>
                    ))}
                  </ul>
                )
              )}
            </div>

            {onEliminar && (
              <button
                type="button"
                className={`detcup-accion detcup-accion--eliminar ${puedeEliminar ? '' : 'detcup-accion--bloqueada'}`}
                aria-disabled={!puedeEliminar}
                aria-describedby={puedeEliminar ? undefined : idAviso}
                onClick={() => { if (puedeEliminar) onEliminar(); }}
              >
                <Trash2 size={18} strokeWidth={2} aria-hidden="true" /> Eliminar cupón
              </button>
            )}
          </div>
        </div>
      </PantallaFormulario>

      {verQR && (
        <PantallaFormulario titulo="QR del cupón" onVolver={() => setVerQR(false)}>
          <h2 className="detact-qr-titulo">{cupon.descripcion}</h2>
          <p className="detcup-nota detcup-nota--centro">Este QR es para <strong>obtener</strong> el cupón.</p>
          <BloqueQR valor={valorQRCupon(cupon.token)} nombreArchivo={`cupon-qr-${cupon.id}`} />
        </PantallaFormulario>
      )}
    </>
  );
}

export default DetalleCupon;
