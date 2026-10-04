import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft } from 'lucide-react';
import './PantallaFormulario.css';

// Pantalla propia para un formulario (actividad, cupón): flecha atrás arriba, título o "Paso N de M" con
// barra de progreso, contenido que se desplaza y, si hay, un pie fijo con el botón principal.
//   paso: { actual, total } muestra "Paso N de M" y la barra; sin paso, se muestra el título.
function PantallaFormulario({ titulo, paso = null, onVolver, pie = null, children }) {
  const raizRef = useRef(null);
  const cuerpoRef = useRef(null);
  const volverRef = useRef(onVolver);
  useEffect(() => { volverRef.current = onVolver; });

  // Mientras está abierta: el panel de atrás ni se desplaza ni recibe foco (inert), el foco entra a la pantalla
  // y, al cerrarla, vuelve al botón que la abrió. Escape equivale a la flecha atrás.
  useEffect(() => {
    const previo = document.activeElement;
    const fondo = document.getElementById('root');
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    if (fondo) fondo.inert = true;
    raizRef.current?.focus();
    const alTeclear = (e) => { if (e.key === 'Escape') volverRef.current?.(); };
    document.addEventListener('keydown', alTeclear);
    return () => {
      document.removeEventListener('keydown', alTeclear);
      document.body.style.overflow = overflow;
      if (fondo) fondo.inert = false;
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
        <div className="pantalla-form-contenido">{children}</div>
      </div>
      {pie && <div className="pantalla-form-pie"><div className="pantalla-form-pie-interno">{pie}</div></div>}
    </div>,
    document.body,
  );
}

export default PantallaFormulario;
