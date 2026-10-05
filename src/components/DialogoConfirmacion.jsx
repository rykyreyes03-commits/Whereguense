import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import './DialogoConfirmacion.css';
import { apilar, esTope } from '../utils/pilaPantallas';

// Ventana propia de la app para confirmar algo (reemplaza a window.confirm): título que dice qué se hace, el texto
// con lo que pasa y dos botones que nombran la acción. Se abre sobre cualquier pantalla: la de abajo queda inerte,
// Escape y tocar fuera cancelan, el foco entra en "Cancelar" (lo seguro) y Tab no sale de la ventana.
//   tono: 'peligro' (acción que no se puede deshacer) o 'normal'.
//   cargando: mientras la acción corre, los botones se apagan y el de confirmar muestra etiquetaCargando.
//   error: si la acción falló, el motivo se muestra dentro de la ventana, que sigue abierta.
function DialogoConfirmacion({
  titulo,
  texto,
  etiquetaConfirmar,
  etiquetaCancelar = 'Cancelar',
  etiquetaCargando = 'Un momento…',
  tono = 'normal',
  cargando = false,
  error = '',
  onConfirmar,
  onCancelar,
}) {
  const idTitulo = useId();
  const idTexto = useId();
  const raizRef = useRef(null);
  const cancelarRef = useRef(null);
  const cancelarFnRef = useRef(onCancelar);
  const cargandoRef = useRef(cargando);
  useEffect(() => { cancelarFnRef.current = onCancelar; cargandoRef.current = cargando; });

  useEffect(() => {
    const yo = raizRef.current;
    const previo = document.activeElement;
    const desapilar = apilar(yo);
    cancelarRef.current?.focus();
    const alTeclear = (e) => {
      if (!esTope(yo)) return;
      if (e.key === 'Escape') {
        if (!cargandoRef.current) cancelarFnRef.current?.();
        return;
      }
      if (e.key === 'Tab') {
        const botones = [...yo.querySelectorAll('button')];
        if (botones.length === 0) return;
        const primero = botones[0];
        const ultimo = botones[botones.length - 1];
        if (e.shiftKey && document.activeElement === primero) { e.preventDefault(); ultimo.focus(); }
        else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primero.focus(); }
      }
    };
    document.addEventListener('keydown', alTeclear);
    return () => {
      document.removeEventListener('keydown', alTeclear);
      desapilar();
      if (previo instanceof HTMLElement && document.contains(previo)) previo.focus();
    };
  }, []);

  return createPortal(
    <div
      className="dialogo-fondo"
      ref={raizRef}
      onMouseDown={(e) => { if (e.target === e.currentTarget && !cargando) onCancelar?.(); }}
    >
      <div className="dialogo" role="alertdialog" aria-modal="true" aria-labelledby={idTitulo} aria-describedby={idTexto}>
        <h2 className="dialogo-titulo" id={idTitulo}>{titulo}</h2>
        <p className="dialogo-texto" id={idTexto}>{texto}</p>
        {error && <p className="dialogo-error" role="alert">{error}</p>}
        <div className="dialogo-botones">
          <button type="button" className="dialogo-boton" ref={cancelarRef} onClick={() => { if (!cargando) onCancelar?.(); }} aria-disabled={cargando}>
            {etiquetaCancelar}
          </button>
          <button
            type="button"
            className={`dialogo-boton dialogo-boton--${tono}`}
            onClick={() => { if (!cargando) onConfirmar?.(); }}
            aria-disabled={cargando}
          >
            {cargando ? etiquetaCargando : etiquetaConfirmar}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default DialogoConfirmacion;
