import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Map as IconoMapa } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import './ModalProximamente.css';

// Aviso de una ciudad que aún no tiene sitios. Se cierra con el botón, con Escape o tocando fuera.
function ModalProximamente({ ciudad, onCerrar }) {
  const { t } = useTranslation();
  const botonRef = useRef(null);
  // onCerrar cambia en cada render del padre; se lee desde una referencia para que el efecto (foco, Escape) corra una sola vez
  const cerrarRef = useRef(onCerrar);
  useEffect(() => { cerrarRef.current = onCerrar; });

  useEffect(() => {
    const previo = document.activeElement;
    botonRef.current?.focus();
    const alTeclear = (e) => {
      if (e.key === 'Escape') { e.stopPropagation(); cerrarRef.current(); }
    };
    window.addEventListener('keydown', alTeclear, true);
    return () => {
      window.removeEventListener('keydown', alTeclear, true);
      if (previo && document.contains(previo)) previo.focus();
    };
  }, []);

  return createPortal(
    <div className="proximamente-fondo" onClick={(e) => { if (e.target === e.currentTarget) onCerrar(); }}>
      <div className="proximamente-tarjeta" role="dialog" aria-modal="true" aria-labelledby="proximamente-titulo">
        <span className="proximamente-icono" aria-hidden="true"><IconoMapa size={30} strokeWidth={1.8} /></span>
        <h2 id="proximamente-titulo" className="proximamente-titulo">{t('proximamente.titulo')}</h2>
        <p className="proximamente-texto">{t('proximamente.texto', { ciudad })}</p>
        <p className="proximamente-pie">{t('proximamente.pie')}</p>
        <button ref={botonRef} type="button" className="proximamente-boton" onClick={onCerrar}>
          {t('comun.volverAria')}
        </button>
      </div>
    </div>,
    document.body,
  );
}

export default ModalProximamente;
