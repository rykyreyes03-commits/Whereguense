import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import './LightboxGaleria.css';

const UMBRAL_SWIPE = 50; // px de desplazamiento horizontal para pasar a otra foto

// Foto de la galería a pantalla completa: fondo negro, la foto sin recortar, X, flechas, swipe y Escape.
//   fotos: [{ id, url }], indice: foto abierta, onCambiar(i) y onCerrar().
function LightboxGaleria({ fotos, indice, nombre, onCambiar, onCerrar }) {
  const { t } = useTranslation();
  const cerrarRef = useRef(null);
  const toque = useRef(null);
  const total = fotos.length;

  const ir = (delta) => onCambiar((indice + delta + total) % total);
  // Las acciones cambian con cada foto; el efecto del teclado lee siempre la última.
  const accionesRef = useRef({});
  useEffect(() => { accionesRef.current = { ir, onCerrar }; });

  useEffect(() => {
    const previo = document.activeElement;
    cerrarRef.current?.focus();
    const alTeclear = (e) => {
      const a = accionesRef.current;
      if (e.key === 'Escape') { e.stopPropagation(); a.onCerrar(); }
      else if (e.key === 'ArrowLeft') a.ir(-1);
      else if (e.key === 'ArrowRight') a.ir(1);
    };
    window.addEventListener('keydown', alTeclear, true);
    const overflowPrevio = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', alTeclear, true);
      document.body.style.overflow = overflowPrevio;
      if (previo && document.contains(previo)) previo.focus();
    };
  }, []);

  const foto = fotos[indice];
  if (!foto) return null;

  const alTocar = (e) => { toque.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; };
  const alSoltar = (e) => {
    const inicio = toque.current;
    toque.current = null;
    if (!inicio || total < 2) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - inicio.x;
    const dy = t.clientY - inicio.y;
    if (Math.abs(dx) >= UMBRAL_SWIPE && Math.abs(dx) > Math.abs(dy)) ir(dx < 0 ? 1 : -1);
  };

  return createPortal(
    <div
      className="lightbox"
      role="dialog"
      aria-modal="true"
      aria-label={nombre ? t('lightbox.fotoNombre', { i: indice + 1, n: total, nombre }) : t('lightbox.foto', { i: indice + 1, n: total })}
      onClick={(e) => { if (e.target === e.currentTarget) onCerrar(); }}
      onTouchStart={alTocar}
      onTouchEnd={alSoltar}
    >
      <img
        className="lightbox-foto"
        src={foto.url}
        alt={nombre ? t('lightbox.fotoNombre', { i: indice + 1, n: total, nombre }) : t('lightbox.foto', { i: indice + 1, n: total })}
        draggable={false}
      />
      <button ref={cerrarRef} type="button" className="lightbox-boton lightbox-cerrar" onClick={onCerrar} aria-label={t('lightbox.cerrar')}>
        <X size={24} strokeWidth={2.4} aria-hidden="true" />
      </button>
      {total > 1 && (
        <>
          <button type="button" className="lightbox-boton lightbox-flecha lightbox-flecha--izq" onClick={() => ir(-1)} aria-label={t('lightbox.anterior')}>
            <ChevronLeft size={28} strokeWidth={2.4} aria-hidden="true" />
          </button>
          <button type="button" className="lightbox-boton lightbox-flecha lightbox-flecha--der" onClick={() => ir(1)} aria-label={t('lightbox.siguiente')}>
            <ChevronRight size={28} strokeWidth={2.4} aria-hidden="true" />
          </button>
          <span className="lightbox-contador" aria-hidden="true">{indice + 1} / {total}</span>
        </>
      )}
    </div>,
    document.body,
  );
}

export default LightboxGaleria;
