import { useRef, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { Download, Printer, Users, QrCode, Power, Plus } from 'lucide-react';
import './GenerarQR.css';
import './CuponesNegocio.css';
import FilaCompacta from './FilaCompacta';
import FormularioCupon from './FormularioCupon';
import PantallaFormulario from './PantallaFormulario';
import { useCuponesNegocio } from '../hooks/useCuponesNegocio';
import { valorQRCupon, valorQRCanje } from '../utils/qr';
import { rangoEscrito, hoyISO } from '../utils/eventos';

// Las fechas con hora (vencimiento, uso) se muestran por su día local: en Nicaragua (UTC-6) el día UTC puede ser el siguiente.
const diaLocal = (valor) => hoyISO(new Date(valor));

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
        <QRCodeCanvas value={valor} size={200} fgColor="#1E2A78" level="M" includeMargin />
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

// Etiqueta de la fila: Activo, Vencido o Desactivado.
function estadoDeCupon(cupon, vencido) {
  if (!cupon.activo) return { texto: 'Desactivado', tono: 'inactiva' };
  if (vencido) return { texto: 'Vencido', tono: 'inactiva' };
  return { texto: 'Activo', tono: 'publicada' };
}

// Vista "Cupones": arriba el QR de canje (uno solo para todo el negocio), luego la lista compacta y el
// botón "+ Nuevo cupón", que abre el formulario en su propia pantalla.
function CuponesNegocio({ negocioId }) {
  const { cupones, tokenCanje, otorgados, cargando, cargarOtorgados, crearCupon, cambiarActivo } =
    useCuponesNegocio(negocioId);

  const [creando, setCreando] = useState(false);
  const [aviso, setAviso] = useState('');
  const [abiertoId, setAbiertoId] = useState(null);
  const [qrAbiertoId, setQrAbiertoId] = useState(null);
  const [otorgadosAbiertoId, setOtorgadosAbiertoId] = useState(null);

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
    <div className="cupones-negocio">
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

      {aviso && <p className="generarqr-aviso" role="status">{aviso}</p>}

      {cupones.length > 0 ? (
        <ul className="fila-compacta-lista">
          {cupones.map((cupon) => {
            const vencido = Boolean(cupon.fecha_expiracion) && new Date(cupon.fecha_expiracion) < new Date();
            const qrAbierto = qrAbiertoId === cupon.id;
            const otorgadosAbierto = otorgadosAbiertoId === cupon.id;
            const deEste = (otorgados || []).filter((o) => o.cupon_id === cupon.id);
            const clave = `cupon-${cupon.id}`;
            return (
              <FilaCompacta
                key={clave}
                id={clave}
                miniatura={<span className="cupon-miniatura-porcentaje">{cupon.descuento_porcentaje}%</span>}
                titulo={cupon.descripcion}
                subtitulo={cupon.fecha_expiracion
                  ? `${vencido ? 'Venció' : 'Vence'} el ${rangoEscrito(diaLocal(cupon.fecha_expiracion))}`
                  : (cupon.limite_total
                    ? `${cupon.obtenidos} de ${cupon.limite_total} obtenidos`
                    : `${cupon.obtenidos} obtenido${cupon.obtenidos === 1 ? '' : 's'}`)}
                estado={estadoDeCupon(cupon, vencido)}
                abierta={abiertoId === cupon.id}
                onAlternar={() => setAbiertoId(abiertoId === cupon.id ? null : cupon.id)}
              >
                <p className="cupones-ayuda cupon-resumen">
                  {cupon.limite_total
                    ? `${cupon.obtenidos} de ${cupon.limite_total} obtenidos`
                    : `${cupon.obtenidos} obtenido${cupon.obtenidos === 1 ? '' : 's'}`}
                  {' · '}{cupon.usados} usado{cupon.usados === 1 ? '' : 's'}
                </p>

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
                    <BloqueQR valor={valorQRCupon(cupon.token)} nombreArchivo={`cupon-qr-${cupon.id}`} />
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
                            {o.estado === 'usado' ? `Usado el ${rangoEscrito(diaLocal(o.fecha_uso))}` : 'Sin usar'}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )
                )}
              </FilaCompacta>
            );
          })}
        </ul>
      ) : (
        !cargando && <p className="generarqr-vacio cupones-vacio">Aún no tienes cupones. Crea el primero con el botón de abajo.</p>
      )}

      <button type="button" className="generarqr-nuevo" onClick={() => { setAviso(''); setCreando(true); }}>
        <Plus size={18} strokeWidth={2.4} aria-hidden="true" /> Nuevo cupón
      </button>

      {creando && (
        <PantallaFormulario titulo="Nuevo cupón" onVolver={() => setCreando(false)}>
          <FormularioCupon
            onCrear={crearCupon}
            onCerrar={() => { setCreando(false); setAviso('Tu cupón quedó creado.'); }}
          />
        </PantallaFormulario>
      )}
    </div>
  );
}

export default CuponesNegocio;
