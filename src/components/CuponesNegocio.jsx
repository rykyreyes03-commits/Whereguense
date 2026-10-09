import { useEffect, useRef, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { Plus, QrCode, Download, ChevronDown } from 'lucide-react';
import './GenerarQR.css';
import './CuponesNegocio.css';
import FilaCompacta from './FilaCompacta';
import BloqueQR from './BloqueQR';
import FormularioCupon from './FormularioCupon';
import DetalleCupon from './DetalleCupon';
import DialogoConfirmacion from './DialogoConfirmacion';
import PantallaFormulario from './PantallaFormulario';
import { useCuponesNegocio } from '../hooks/useCuponesNegocio';
import { valorQRCanje } from '../utils/qr';
import { rangoEscrito, hoyISO, cuponVencido } from '../utils/eventos';
import { useAhora } from '../hooks/useAhora';

// Las fechas con hora (vencimiento) se muestran por su día local: en Nicaragua (UTC-6) el día UTC puede ser el siguiente.
const diaLocal = (valor) => hoyISO(new Date(valor));

// Etiqueta de la fila: Activo, Vencido o Desactivado.
// Mismo orden que estadoDeCupon (la tarjeta): primero si venció y después si está desactivado.
function estadoDeCuponFila(cupon, vencido) {
  if (vencido) return { texto: 'Vencido', tono: 'inactiva' };
  if (!cupon.activo) return { texto: 'Desactivado', tono: 'inactiva' };
  return { texto: 'Activo', tono: 'publicada' };
}

// El QR de canje (uno para todo el negocio) en una sola fila: "Ver" lo abre en pantalla y "Descargar" baja la imagen
// sin abrirlo (el QR se dibuja oculto solo para eso).
function FilaQRCanje({ token, onVer }) {
  const ocultoRef = useRef(null);
  const descargar = () => {
    const canvas = ocultoRef.current?.querySelector('canvas');
    if (!canvas) return;
    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    link.download = 'cupones-qr-canje.png';
    link.click();
  };
  return (
    <div className="cupones-canje-fila">
      <span className="cupones-canje-icono" aria-hidden="true"><QrCode size={22} strokeWidth={1.8} /></span>
      <span className="cupones-canje-texto">
        <strong>QR para canjear cupones</strong>
        <span>Uno solo para todo tu negocio: ponlo junto a la caja.</span>
      </span>
      <span className="cupones-canje-botones">
        <button type="button" className="cupones-canje-boton" onClick={onVer}>Ver</button>
        <button type="button" className="cupones-canje-boton" onClick={descargar} aria-label="Descargar el QR para canjear cupones">
          <Download size={15} strokeWidth={2.2} aria-hidden="true" /> Descargar
        </button>
      </span>
      <span ref={ocultoRef} className="cupones-canje-oculto" aria-hidden="true">
        <QRCodeCanvas value={valorQRCanje(token)} size={400} fgColor="#1E2A78" level="M" includeMargin />
      </span>
    </div>
  );
}

// Vista "Cupones": arriba el QR de canje en una fila (Ver y Descargar), luego la lista compacta y el botón
// "+ Nuevo cupón". Al tocar un cupón se abre su pantalla (la tarjeta como la ve el turista y sus acciones);
// los formularios de crear y editar abren en su propia pantalla.
function CuponesNegocio({ negocioId, nombreNegocio = '' }) {
  const {
    cupones, tokenCanje, otorgados, cargando, cargar, cargarOtorgados, crearCupon, cambiarActivo, editarCupon, borrarCupon,
  } = useCuponesNegocio(negocioId);

  const [creando, setCreando] = useState(false);
  const [vencidosAbiertos, setVencidosAbiertos] = useState(false);
  const ahora = useAhora(); // cada minuto se vuelve a evaluar qué venció: pasa solo a "Vencidos"
  const [aviso, setAviso] = useState('');
  const [detalleId, setDetalleId] = useState(null);
  const [editandoId, setEditandoId] = useState(null);
  const [avisoDetalle, setAvisoDetalle] = useState('');
  const [verCanje, setVerCanje] = useState(false);
  const [porEliminar, setPorEliminar] = useState(null); // id del cupón de la ventana de eliminar
  const [eliminando, setEliminando] = useState(false);
  const eliminandoRef = useRef(false);
  const [errorEliminar, setErrorEliminar] = useState('');
  const avisoRef = useRef(null);

  const vencidos = cupones.filter((c) => cuponVencido(c, ahora));
  const vigentes = cupones.filter((c) => !cuponVencido(c, ahora)); // activos y desactivados que aún no vencieron

  const renderFilaCupon = (cupon) => {
    const vencido = cuponVencido(cupon, ahora);
    return (
      <FilaCompacta
        key={cupon.id}
        id={`cupon-${cupon.id}`}
        miniatura={<span className="cupon-miniatura-porcentaje">{cupon.descuento_porcentaje}%</span>}
        titulo={cupon.descripcion}
        subtitulo={cupon.fecha_expiracion
          ? `${vencido ? 'Venció' : 'Vence'} el ${rangoEscrito(diaLocal(cupon.fecha_expiracion))}`
          : (cupon.limite_total
            ? `${cupon.obtenidos} de ${cupon.limite_total} obtenidos`
            : `${cupon.obtenidos} obtenido${cupon.obtenidos === 1 ? '' : 's'}`)}
        estado={estadoDeCuponFila(cupon, vencido)}
        onAbrir={() => { setAviso(''); setAvisoDetalle(''); setDetalleId(cupon.id); cargar(); }}
      />
    );
  };

  const cuponAbierto = detalleId == null ? null : cupones.find((c) => c.id === detalleId) || null;
  const cuponEnEdicion = editandoId == null ? null : cupones.find((c) => c.id === editandoId) || null;

  // Al terminar algo el foco pasa al aviso (la pantalla desde la que se actuó ya no existe).
  useEffect(() => {
    if (aviso) avisoRef.current?.focus({ preventScroll: true });
  }, [aviso]);

  const handleCambiarActivo = async (cupon) => {
    const quedaActivo = !cupon.activo; // se decide antes de la llamada: después `cupon` ya puede estar actualizado
    const resultado = await cambiarActivo(cupon.id, quedaActivo);
    if (!resultado.exito) window.alert(resultado.mensaje);
    else setAvisoDetalle(quedaActivo ? 'Cupón activado.' : 'Cupón desactivado.');
  };

  const cerrarConfirmacion = () => {
    setPorEliminar(null);
    setErrorEliminar('');
  };

  const handleEliminar = async () => {
    if (porEliminar == null || eliminandoRef.current) return;
    eliminandoRef.current = true;
    setEliminando(true);
    setErrorEliminar('');
    let resultado;
    try {
      resultado = await borrarCupon(porEliminar);
    } catch (error) {
      console.error('Error eliminando el cupón:', error);
      resultado = { exito: false, mensaje: 'No se pudo eliminar el cupón. Revisa tu conexión e intenta de nuevo.' };
    }
    eliminandoRef.current = false;
    setEliminando(false);

    if (!resultado.exito) {
      setErrorEliminar(resultado.mensaje);
      return;
    }
    cerrarConfirmacion();
    setDetalleId(null);
    setAviso('Cupón eliminado.');
  };

  return (
    <div className="cupones-negocio">
      {tokenCanje ? (
        <FilaQRCanje token={tokenCanje} onVer={() => setVerCanje(true)} />
      ) : (
        <p className="cupones-ayuda cupones-canje-vacio">
          {cargando ? 'Cargando…' : 'Tu QR para canjear cupones aparece aquí cuando crees tu primer cupón.'}
        </p>
      )}

      {aviso && <p className="generarqr-aviso" role="status" tabIndex={-1} ref={avisoRef}>{aviso}</p>}

      {vigentes.length > 0 ? (
        <ul className="fila-compacta-lista">{vigentes.map(renderFilaCupon)}</ul>
      ) : (
        !cargando && (
          <p className="generarqr-vacio cupones-vacio">
            {cupones.length === 0
              ? 'Aún no tienes cupones. Crea el primero con el botón de abajo.'
              : 'No tienes cupones vigentes. Crea uno con el botón de abajo.'}
          </p>
        )
      )}

      <button type="button" className="generarqr-nuevo" onClick={() => { setAviso(''); setCreando(true); }}>
        <Plus size={18} strokeWidth={2.4} aria-hidden="true" /> Nuevo cupón
      </button>

      {vencidos.length > 0 && (
        <div className="generarqr-anteriores">
          <button
            type="button"
            className="generarqr-anteriores-toggle"
            aria-expanded={vencidosAbiertos}
            aria-controls={vencidosAbiertos ? 'cupones-vencidos' : undefined}
            onClick={() => setVencidosAbiertos((v) => !v)}
          >
            Vencidos ({vencidos.length})
            <ChevronDown size={16} strokeWidth={2.2} aria-hidden="true" className={vencidosAbiertos ? 'girada' : ''} />
          </button>
          {vencidosAbiertos && <ul className="fila-compacta-lista" id="cupones-vencidos">{vencidos.map(renderFilaCupon)}</ul>}
        </div>
      )}

      {cuponAbierto && (
        <DetalleCupon
          cupon={cuponAbierto}
          negocio={nombreNegocio}
          otorgados={otorgados === null ? null : otorgados.filter((o) => o.cupon_id === cuponAbierto.id)}
          aviso={avisoDetalle}
          onVolver={() => setDetalleId(null)}
          onEditar={() => { setAvisoDetalle(''); setEditandoId(cuponAbierto.id); cargar(); }}
          onCambiarActivo={handleCambiarActivo}
          onVerOtorgados={cargarOtorgados}
          onEliminar={() => { setErrorEliminar(''); setPorEliminar(cuponAbierto.id); cargar(); }}
        />
      )}

      {cuponEnEdicion && (
        <FormularioCupon
          cupon={cuponEnEdicion}
          onGuardar={editarCupon}
          onSalir={() => setEditandoId(null)}
          onCerrar={() => { setEditandoId(null); setAvisoDetalle('Cambios guardados.'); }}
        />
      )}

      {creando && (
        <FormularioCupon
          onCrear={crearCupon}
          onSalir={() => setCreando(false)}
          onCerrar={() => { setCreando(false); setAviso('Tu cupón quedó creado.'); }}
        />
      )}

      {verCanje && tokenCanje && (
        <PantallaFormulario titulo="QR para canjear cupones" onVolver={() => setVerCanje(false)}>
          <p className="cupones-ayuda">
            Un solo código para todo tu negocio. Ponlo junto a la caja: el turista lo escanea y elige qué cupón usar.
          </p>
          <BloqueQR valor={valorQRCanje(tokenCanje)} nombreArchivo="cupones-qr-canje" />
        </PantallaFormulario>
      )}

      {porEliminar != null && (
        <DialogoConfirmacion
          titulo="¿Eliminar este cupón?"
          texto="Se borrará el cupón y su QR. No se puede deshacer."
          etiquetaConfirmar="Eliminar"
          etiquetaCargando="Eliminando…"
          tono="peligro"
          cargando={eliminando}
          error={errorEliminar}
          onConfirmar={handleEliminar}
          onCancelar={cerrarConfirmacion}
        />
      )}
    </div>
  );
}

export default CuponesNegocio;
