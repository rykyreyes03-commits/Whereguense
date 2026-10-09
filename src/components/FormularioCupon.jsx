import { useId, useRef, useState } from 'react';
import { Ticket, Check, Lock } from 'lucide-react';
import './GenerarQR.css';
import './CuponesNegocio.css';
import './FormularioActividad.css';
import PantallaFormulario from './PantallaFormulario';
import DialogoConfirmacion from './DialogoConfirmacion';
import { hoyISO } from '../utils/eventos';

// Mismo máximo que limite_total en la base (027).
const MAX_LIMITE = 200;

// Formulario de un cupón en su propia pantalla (PantallaFormulario). Con `cupon` edita uno existente, con las
// reglas de la base: el porcentaje no cambia si alguien ya lo obtuvo, el límite no baja de lo ya obtenido y el
// vencimiento solo se amplía (o se quita); un cupón que no vence no puede recibir fecha.
//   onCrear(datos) / onGuardar(cupon, datos) -> { exito, mensaje }; onCerrar() se llama al guardar bien;
//   onSalir() al volver atrás (con confirmación si hay cambios).
function FormularioCupon({ cupon = null, onCrear, onGuardar, onCerrar, onSalir }) {
  const editando = Boolean(cupon);
  const obtenidos = cupon?.obtenidos || 0;
  const idNotaPorcentaje = useId();
  const idNotaVence = useId();
  const idNotaLimite = useId();

  // El vencimiento se guarda como el fin de un día (hora local): se muestra ese día.
  const diaInicial = cupon?.fecha_expiracion ? hoyISO(new Date(cupon.fecha_expiracion)) : '';
  const [inicial] = useState(() => ({
    descripcion: cupon?.descripcion || '',
    descuento: cupon ? String(cupon.descuento_porcentaje) : '',
    fecha: diaInicial,
    limite: cupon?.limite_total ? String(cupon.limite_total) : '',
  }));
  const [descripcion, setDescripcion] = useState(inicial.descripcion);
  const [descuento, setDescuento] = useState(inicial.descuento);
  const [fechaExpiracion, setFechaExpiracion] = useState(inicial.fecha);
  const [limite, setLimite] = useState(inicial.limite);
  const [guardando, setGuardando] = useState(false);
  const guardandoRef = useRef(false);
  const [confirmandoSalida, setConfirmandoSalida] = useState(false);

  const hoy = hoyISO();
  const porcentajeBloqueado = editando && obtenidos > 0;
  const sinVencimiento = editando && !cupon.fecha_expiracion; // no se le puede poner fecha
  // Solo se amplía: no antes de la fecha que ya tiene ni de hoy.
  const minimoVence = editando && diaInicial > hoy ? diaInicial : hoy;

  const descuentoNum = descuento.trim() === '' ? null : Number(descuento);
  const descuentoInvalido = descuentoNum !== null
    && (!Number.isInteger(descuentoNum) || descuentoNum < 1 || descuentoNum > 100);
  const limiteNum = limite.trim() === '' ? null : Number(limite);
  const limiteDebajoDeObtenido = editando && limiteNum !== null && limiteNum < obtenidos;
  const limiteInvalido = limiteNum !== null
    && (!Number.isInteger(limiteNum) || limiteNum < 1 || limiteNum > MAX_LIMITE || limiteDebajoDeObtenido);
  const mensajeLimite = limiteDebajoDeObtenido
    ? `No puede ser menor a lo ya obtenido (${obtenidos}).`
    : limiteNum !== null && limiteNum > MAX_LIMITE
      ? `El máximo es ${MAX_LIMITE} cupones.`
      : 'Escribe un número entero de 1 en adelante.';
  const fechaAcortada = editando && fechaExpiracion && fechaExpiracion < diaInicial;
  const fechaPasada = Boolean(fechaExpiracion) && fechaExpiracion < hoy && fechaExpiracion !== diaInicial;
  const puedeGuardar = descripcion.trim() && descuentoNum !== null && !descuentoInvalido && !limiteInvalido
    && !fechaAcortada && !fechaPasada && !guardando;

  const hayCambios = descripcion !== inicial.descripcion || descuento !== inicial.descuento
    || fechaExpiracion !== inicial.fecha || limite !== inicial.limite;

  const volver = () => {
    if (guardando) return;
    if (hayCambios) setConfirmandoSalida(true);
    else onSalir?.();
  };

  const handleGuardar = async (e) => {
    e.preventDefault();
    if (!puedeGuardar || guardandoRef.current) return; // el ref frena un segundo toque antes de que React pinte

    guardandoRef.current = true;
    setGuardando(true);
    const datos = {
      descripcion: descripcion.trim(),
      descuento: descuentoNum,
      fechaExpiracion: fechaExpiracion || (editando ? '' : null),
      limiteTotal: limiteNum,
    };
    let resultado;
    try {
      resultado = await (editando ? onGuardar(cupon, datos) : onCrear(datos));
    } catch (error) {
      console.error('Error guardando el cupón:', error);
      resultado = { exito: false, mensaje: 'No se pudo guardar el cupón. Revisa tu conexión e intenta de nuevo.' };
    } finally {
      guardandoRef.current = false;
      setGuardando(false);
    }

    if (!resultado.exito) {
      window.alert(resultado.mensaje);
      return;
    }
    onCerrar?.();
  };

  const pie = (
    <button className="generarqr-generar-btn" disabled={!puedeGuardar} type="submit" form="formulario-cupon">
      {guardando ? 'Guardando...' : editando
        ? <><Check size={18} strokeWidth={2.4} aria-hidden="true" /> Guardar cambios</>
        : <><Ticket size={18} strokeWidth={2} aria-hidden="true" /> Crear cupón</>}
    </button>
  );

  return (
    <>
      <PantallaFormulario titulo={editando ? 'Editar cupón' : 'Nuevo cupón'} onVolver={volver} pie={pie}>
        <form id="formulario-cupon" className="generarqr-form" onSubmit={handleGuardar} noValidate>
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
              disabled={porcentajeBloqueado}
              onChange={(e) => setDescuento(e.target.value)}
              aria-invalid={descuentoInvalido}
              aria-describedby={porcentajeBloqueado ? idNotaPorcentaje : undefined}
            />
            {descuentoInvalido && <small className="generarqr-ayuda--error cupon-error">Escribe un número entero entre 1 y 100.</small>}
          </label>
          {porcentajeBloqueado && (
            <p className="formact-bloqueo" id={idNotaPorcentaje}>
              <Lock size={16} strokeWidth={2} aria-hidden="true" />
              <span>Ya lo {obtenidos === 1 ? 'obtuvo 1 persona' : `obtuvieron ${obtenidos} personas`}: el porcentaje no se puede cambiar.</span>
            </p>
          )}

          <label className="generarqr-campo">
            <span>Vence el {!editando && <em>(opcional)</em>}</span>
            <input
              type="date"
              className={`generarqr-input ${fechaAcortada || fechaPasada ? 'generarqr-input--error' : ''}`}
              min={minimoVence}
              value={fechaExpiracion}
              disabled={sinVencimiento}
              onChange={(e) => setFechaExpiracion(e.target.value)}
              aria-invalid={Boolean(fechaAcortada || fechaPasada)}
              aria-describedby={editando ? idNotaVence : undefined}
            />
          </label>
          {editando && (
            <p className="formact-bloqueo" id={idNotaVence}>
              <Lock size={16} strokeWidth={2} aria-hidden="true" />
              <span>
                {sinVencimiento
                  ? 'Este cupón no vence, y no se le puede poner una fecha de vencimiento.'
                  : fechaAcortada || fechaPasada
                    ? 'La fecha de vencimiento solo se puede ampliar, hacia adelante.'
                    : 'La fecha de vencimiento solo se puede ampliar. Si borras la fecha, el cupón deja de vencer.'}
              </span>
            </p>
          )}

          <label className="generarqr-campo">
            <span>¿Cuántos cupones quieres repartir? <em>(opcional)</em></span>
            <input
              type="number"
              inputMode="numeric"
              min={editando && obtenidos > 0 ? obtenidos : 1}
              max={MAX_LIMITE}
              step="1"
              className={`generarqr-input ${limiteInvalido ? 'generarqr-input--error' : ''}`}
              placeholder="Sin límite"
              value={limite}
              onChange={(e) => setLimite(e.target.value)}
              aria-invalid={limiteInvalido}
              aria-describedby={idNotaLimite}
            />
            <small id={idNotaLimite} className={limiteInvalido ? 'generarqr-ayuda--error cupon-error' : 'cupon-ayuda-campo'}>
              {limiteInvalido
                ? mensajeLimite
                : editando && obtenidos > 0
                  ? `Ya hay ${obtenidos} obtenido${obtenidos === 1 ? '' : 's'}: el límite no puede ser menor. Máximo ${MAX_LIMITE}.`
                  : `Déjalo vacío para no poner límite. Máximo ${MAX_LIMITE}.`}
            </small>
          </label>
        </form>
      </PantallaFormulario>

      {confirmandoSalida && (
        <DialogoConfirmacion
          titulo="¿Salir sin guardar?"
          texto="Se perderán los cambios que hiciste en el cupón."
          etiquetaConfirmar="Salir sin guardar"
          etiquetaCancelar="Seguir editando"
          tono="peligro"
          onConfirmar={() => { setConfirmandoSalida(false); onSalir?.(); }}
          onCancelar={() => setConfirmandoSalida(false)}
        />
      )}
    </>
  );
}

export default FormularioCupon;
