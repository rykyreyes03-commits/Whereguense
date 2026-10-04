import { useState } from 'react';
import { Ticket } from 'lucide-react';
import './GenerarQR.css';
import './CuponesNegocio.css';
import { hoyISO } from '../utils/eventos';

// Mismo máximo que limite_total en la base (027).
const MAX_LIMITE = 200;

// Formulario de un cupón nuevo. Vive en su propia pantalla (PantallaFormulario).
//   onCrear(datos) -> { exito, mensaje }; onCerrar() se llama al guardar bien.
function FormularioCupon({ onCrear, onCerrar }) {
  const [descripcion, setDescripcion] = useState('');
  const [descuento, setDescuento] = useState('');
  const [fechaExpiracion, setFechaExpiracion] = useState('');
  const [limite, setLimite] = useState('');
  const [guardando, setGuardando] = useState(false);

  const hoy = hoyISO();

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
    const resultado = await onCrear({
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
    onCerrar?.();
  };

  return (
    <form className="generarqr-form" onSubmit={handleCrear} noValidate>
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
  );
}

export default FormularioCupon;
