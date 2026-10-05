import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft } from 'lucide-react';
import './PantallaFormulario.css';
import { apilar, esTope } from '../utils/pilaPantallas';

// Pantalla propia para un formulario (actividad, cupón): flecha atrás arriba, título o "Paso N de M" con
// barra de progreso, contenido que se desplaza y, si hay, un pie fijo con el botón principal.
//   paso: { actual, total } muestra "Paso N de M" y la barra; sin paso, se muestra el título.
//   sinRelleno: el contenido llega hasta los bordes (la pantalla de detalle trae su propia foto y márgenes).
function PantallaFormulario({ titulo, paso = null, onVolver, pie = null, sinRelleno = false, children }) {
  const raizRef = useRef(null);
  const cuerpoRef = useRef(null);
  const volverRef = useRef(onVolver);
  useEffect(() => { volverRef.current = onVolver; });

  // Mientras está abierta: lo que queda debajo (la página u otra pantalla) ni se desplaza ni recibe foco (inert),
  // el foco entra a la pantalla y, al cerrarla, vuelve al botón que la abrió. Escape equivale a la flecha atrás,
  // pero solo en la pantalla de arriba.
  useEffect(() => {
    const yo = raizRef.current;
    const previo = document.activeElement;
    const desapilar = apilar(yo);
    yo?.focus();
    const alTeclear = (e) => { if (e.key === 'Escape' && esTope(yo)) volverRef.current?.(); };
    document.addEventListener('keydown', alTeclear);
    return () => {
      document.removeEventListener('keydown', alTeclear);
      desapilar();
      if (previo instanceof HTMLElement && document.contains(previo)) previo.focus();
    };
  }, []);

  // Cada paso nuevo empieza arriba.
  const pasoActual = paso?.actual;
  useEffect(() => { cuerpoRef.current?.scrollTo(0, 0); }, [pasoActual]);

  return createPortal(
    <div className="pantalla-form" role="dialog" aria-modal="true" aria-label={titulo} ref={raizRef} tabIndex={-1}>
      <div className="pantalla-form-cuerpo" ref={cuerpoRef}>
        <header className="pantalla-form-cabecera">
          <div className="pantalla-form-fila">
            <button type="button" className="pantalla-form-volver" onClick={onVolver} aria-label={paso && paso.actual > 1 ? 'Volver al paso anterior' : 'Volver'}>
              <ArrowLeft size={22} strokeWidth={2.2} aria-hidden="true" />
            </button>
            <span className="pantalla-form-titulo">{paso ? `Paso ${paso.actual} de ${paso.total}` : titulo}</span>
          </div>
          {paso && (
            <div className="pantalla-form-progreso" role="progressbar" aria-valuemin={1} aria-valuemax={paso.total} aria-valuenow={paso.actual} aria-label={`Paso ${paso.actual} de ${paso.total}`}>
              {Array.from({ length: paso.total }, (_, i) => (
                <span key={i} className={i < paso.actual ? 'lleno' : ''} />
              ))}
            </div>
          )}
        </header>
        <div className={`pantalla-form-contenido ${sinRelleno ? 'pantalla-form-contenido--libre' : ''}`}>{children}</div>
      </div>
      {pie && <div className="pantalla-form-pie"><div className="pantalla-form-pie-interno">{pie}</div></div>}
    </div>,
    document.body,
  );
}

export default PantallaFormulario;
