import { useRef, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { Download, Printer, Users, QrCode, Power, Ticket } from 'lucide-react';
import './GenerarQR.css';
import './CuponesNegocio.css';
import { useCuponesNegocio } from '../hooks/useCuponesNegocio';
import { valorQRCupon, valorQRCanje } from '../utils/qr';

// Mismo máximo que limite_total en la base (027).
const MAX_LIMITE = 200;

function formatearFecha(iso) {
  return new Date(iso).toLocaleDateString('es-NI', { day: 'numeric', month: 'short', year: 'numeric' });
}

function descargarCanvas(contenedor, nombreArchivo) {
  const canvas = contenedor?.querySelector('canvas');
  if (!canvas) return;
  const link = document.createElement('a');
  link.href = canvas.toDataURL('image/png');
  link.download = `${nombreArchivo}.png`;
  link.click();
}

// QR con los botones de descargar / imprimir (mismo patrón que los QR de sello).
function BloqueQR({ valor, nombreArchivo }) {
  const areaRef = useRef(null);
  return (
    <>
      <div className="generarqr-qr-area" ref={areaRef}>
        <QRCodeCanvas value={valor} size={200} fgColor="#1119BC" level="M" includeMargin />
      </div>
      <div className="generarqr-acciones">
        <button className="generarqr-accion" onClick={() => descargarCanvas(areaRef.current, nombreArchivo)} type="button">
          <Download size={16} strokeWidth={2} aria-hidden="true" /> Descargar
        </button>
        <button className="generarqr-accion" onClick={() => window.print()} type="button">
          <Printer size={16} strokeWidth={2} aria-hidden="true" /> Imprimir
        </button>
      </div>
    </>
  );
}

function CuponesNegocio({ negocioId }) {
  const { cupones, tokenCanje, otorgados, cargando, cargarOtorgados, crearCupon, cambiarActivo } =
    useCuponesNegocio(negocioId);

  const [descripcion, setDescripcion] = useState('');
  const [descuento, setDescuento] = useState('');
  const [fechaExpiracion, setFechaExpiracion] = useState('');
  const [limite, setLimite] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [qrAbiertoId, setQrAbiertoId] = useState(null);
  const [otorgadosAbiertoId, setOtorgadosAbiertoId] = useState(null);

  const hoy = new Date().toISOString().slice(0, 10);

  const descuentoNum = descuento.trim() === '' ? null : Number(descuento);
  const descuentoInvalido = descuentoNum !== null
    && (!Number.isInteger(descuentoNum) || descuentoNum < 1 || descuentoNum > 100);
  const limiteNum = limite.trim() === '' ? null : Number(limite);
  const limiteInvalido = limiteNum !== null
    && (!Number.isInteger(limiteNum) || limiteNum < 1 || limiteNum > MAX_LIMITE);
  const mensajeLimite = limiteNum !== null && limiteNum > MAX_LIMITE
    ? `El máximo es ${MAX_LIMITE} cupones.`
    : 'Escribe un número entero de 1 en adelante.';
  const puedeCrear = descripcion.trim() && descuentoNum !== null && !descuentoInvalido && !limiteInvalido && !guardando;

  const handleCrear = async (e) => {
    e.preventDefault();
    if (!puedeCrear) return;

    setGuardando(true);
    const resultado = await crearCupon({
      descripcion: descripcion.trim(),
      descuento: descuentoNum,
      fechaExpiracion: fechaExpiracion || null,
      limiteTotal: limiteNum,
    });
    setGuardando(false);

    if (!resultado.exito) {
      window.alert(resultado.mensaje);
      return;
    }
    setDescripcion('');
    setDescuento('');
    setFechaExpiracion('');
    setLimite('');
  };

  const handleCambiarActivo = async (cupon) => {
    const resultado = await cambiarActivo(cupon.id, !cupon.activo);
    if (!resultado.exito) window.alert(resultado.mensaje);
  };

  const handleVerOtorgados = async (cuponId) => {
    if (otorgadosAbiertoId === cuponId) {
      setOtorgadosAbiertoId(null);
      return;
    }
    setOtorgadosAbiertoId(cuponId);
    await cargarOtorgados(); // siempre al día: los turistas los obtienen y usan todo el tiempo
  };

  return (
    <section className="cupones-negocio" aria-labelledby="cupones-titulo">
      <h2 className="cupones-titulo" id="cupones-titulo">Cupones</h2>

      <div className="cupones-canje">
        <h3 className="cupones-subtitulo">QR para canjear cupones</h3>
        {tokenCanje ? (
          <>
            <p className="cupones-ayuda">
              Un solo código para todo tu negocio. Ponlo junto a la caja: el turista lo escanea y elige qué cupón usar.
            </p>
            <BloqueQR valor={valorQRCanje(tokenCanje)} nombreArchivo="cupones-qr-canje" />
          </>
        ) : (
          <p className="cupones-ayuda">
            {cargando
              ? 'Cargando…'
              : 'Tu QR de canje aparece aquí cuando crees tu primer cupón.'}
          </p>
        )}
      </div>

      {cupones.length > 0 ? (
        <div className="generarqr-lista">
          {cupones.map((cupon) => {
            const vencido = Boolean(cupon.fecha_expiracion) && new Date(cupon.fecha_expiracion) < new Date();
            const qrAbierto = qrAbiertoId === cupon.id;
            const otorgadosAbierto = otorgadosAbiertoId === cupon.id;
            const deEste = (otorgados || []).filter((o) => o.cupon_id === cupon.id);
            return (
              <div key={cupon.id} className={`generarqr-item cupon-item ${cupon.activo ? '' : 'cupon-item--inactivo'}`}>
                <div className="cupon-item-cabecera">
                  <span className="cupon-item-porcentaje">{cupon.descuento_porcentaje}%</span>
                  <div className="generarqr-item-info">
                    <strong>{cupon.descripcion}</strong>
                    <span>
                      {cupon.limite_total
                        ? `${cupon.obtenidos} de ${cupon.limite_total} obtenidos`
                        : `${cupon.obtenidos} obtenido${cupon.obtenidos === 1 ? '' : 's'}`}
                      {' · '}{cupon.usados} usado{cupon.usados === 1 ? '' : 's'}
                    </span>
                    {cupon.fecha_expiracion && (
                      <span>{vencido ? 'Venció' : 'Vence'}: {formatearFecha(cupon.fecha_expiracion)}</span>
                    )}
                  </div>
                </div>

                <span className={`generarqr-estado ${cupon.activo && !vencido ? 'generarqr-estado--aprobado' : 'cupon-estado--inactivo'}`}>
                  {!cupon.activo ? 'Desactivado' : vencido ? 'Vencido' : 'Activo'}
                </span>

                <div className="generarqr-item-acciones cupon-acciones">
                  <button type="button" className="generarqr-accion" onClick={() => setQrAbiertoId(qrAbierto ? null : cupon.id)}>
                    <QrCode size={16} strokeWidth={2} aria-hidden="true" /> {qrAbierto ? 'Ocultar QR' : 'Ver QR'}
                  </button>
                  <button type="button" className="generarqr-accion" onClick={() => handleVerOtorgados(cupon.id)}>
                    <Users size={16} strokeWidth={2} aria-hidden="true" /> {otorgadosAbierto ? 'Ocultar' : '¿Quién lo tiene?'}
                  </button>
                </div>
                <button type="button" className="cupon-toggle" onClick={() => handleCambiarActivo(cupon)}>
                  <Power size={15} strokeWidth={2} aria-hidden="true" /> {cupon.activo ? 'Desactivar cupón' : 'Activar cupón'}
                </button>
                {cupon.activo && (
                  <p className="cupon-nota">Desactivarlo evita que se obtengan más. Quien ya lo tiene lo puede usar hasta que venza.</p>
                )}

                {qrAbierto && (
                  <>
                    <p className="cupones-ayuda cupon-qr-ayuda">Este QR es para <strong>obtener</strong> el cupón.</p>
                    <BloqueQR valor={valorQRCupon(cupon.token)} nombreArchivo={`cupon-qr-${cupon.descripcion}`} />
                  </>
                )}

                {otorgadosAbierto && (
                  otorgados === null ? (
                    <p className="cupones-ayuda">Cargando…</p>
                  ) : deEste.length === 0 ? (
                    <p className="cupones-ayuda">Todavía nadie tiene este cupón.</p>
                  ) : (
                    <ul className="cupon-otorgados">
                      {deEste.map((o) => (
                        <li key={o.id}>
                          <span className="cupon-otorgado-nombre">{o.turista}</span>
                          <span className={`cupon-otorgado-estado ${o.estado === 'usado' ? 'cupon-otorgado-estado--usado' : ''}`}>
                            {o.estado === 'usado' ? `Usado el ${formatearFecha(o.fecha_uso)}` : 'Sin usar'}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )
                )}
              </div>
            );
          })}
        </div>
      ) : (
        !cargando && <p className="generarqr-vacio cupones-vacio">Aún no tienes cupones. Crea el primero abajo.</p>
      )}

      <form className="generarqr-form" onSubmit={handleCrear} noValidate>
        <h3 className="generarqr-subtitulo">Crear cupón</h3>

        <label className="generarqr-campo">
          <span>Descripción</span>
          <input
            type="text"
            className="generarqr-input"
            placeholder="Ej. 20% de descuento en cualquier producto"
            maxLength={300}
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
          />
        </label>

        <label className="generarqr-campo">
          <span>Porcentaje de descuento</span>
          <input
            type="number"
            inputMode="numeric"
            min="1"
            max="100"
            step="1"
            className={`generarqr-input ${descuentoInvalido ? 'generarqr-input--error' : ''}`}
            placeholder="Ej. 20"
            value={descuento}
            onChange={(e) => setDescuento(e.target.value)}
            aria-invalid={descuentoInvalido}
          />
          {descuentoInvalido && <small className="generarqr-ayuda--error cupon-error">Escribe un número entero entre 1 y 100.</small>}
        </label>

        <label className="generarqr-campo">
          <span>Vence el <em>(opcional)</em></span>
          <input
            type="date"
            className="generarqr-input"
            min={hoy}
            value={fechaExpiracion}
            onChange={(e) => setFechaExpiracion(e.target.value)}
          />
        </label>

        <label className="generarqr-campo">
          <span>¿Cuántos cupones quieres repartir? <em>(opcional)</em></span>
          <input
            type="number"
            inputMode="numeric"
            min="1"
            max={MAX_LIMITE}
            step="1"
            className={`generarqr-input ${limiteInvalido ? 'generarqr-input--error' : ''}`}
            placeholder="Sin límite"
            value={limite}
            onChange={(e) => setLimite(e.target.value)}
            aria-invalid={limiteInvalido}
          />
          <small className={limiteInvalido ? 'generarqr-ayuda--error cupon-error' : 'cupon-ayuda-campo'}>
            {limiteInvalido ? mensajeLimite : `Déjalo vacío para no poner límite. Máximo ${MAX_LIMITE}.`}
          </small>
        </label>

        <button className="generarqr-generar-btn" disabled={!puedeCrear} type="submit">
          {guardando ? 'Guardando...' : (
            <>
              <Ticket size={18} strokeWidth={2} aria-hidden="true" /> Crear cupón
            </>
          )}
        </button>
      </form>
    </section>
  );
}

export default CuponesNegocio;
