import { useId, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Star } from 'lucide-react';
import { textoPromedio } from '../utils/resenas';
import './Estrellas.css';

// Solo lectura: cinco estrellas con el valor. Para lectores de pantalla es una sola imagen con el valor completo
// ("4.6 de 5 estrellas"); las estrellas sueltas quedan ocultas.
export function EstrellasValor({ valor, tamano = 16 }) {
  const { t } = useTranslation();
  const lleno = Math.round(Number(valor) || 0);
  return (
    <span className="estrellas" role="img" aria-label={t('resenas.estrellasValor', { valor: textoPromedio(valor) })}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} size={tamano} strokeWidth={2} aria-hidden="true" className={n <= lleno ? 'estrella estrella--llena' : 'estrella'} />
      ))}
    </span>
  );
}

// Para elegir de 1 a 5: un grupo de botones de opción con teclado propio (flechas mueven y eligen; Tab entra y sale del
// grupo en una sola parada). Cada estrella mide 44 px de alto para el dedo.
export function EstrellasInput({ valor, onCambiar, etiqueta = null, describedBy }) {
  const { t } = useTranslation();
  const idEtiqueta = useId();
  const refs = useRef([]);
  const elegir = (n) => {
    onCambiar(n);
    refs.current[n - 1]?.focus();
  };
  const alTeclear = (e) => {
    // Las flechas parten de la estrella que tiene el foco (sin valor todavía, la primera).
    const actual = refs.current.indexOf(document.activeElement) + 1 || valor || 0;
    let siguiente = null;
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') siguiente = Math.min(5, actual + 1);
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') siguiente = Math.max(1, actual - 1);
    else if (e.key === 'Home') siguiente = 1;
    else if (e.key === 'End') siguiente = 5;
    if (siguiente != null) {
      e.preventDefault();
      elegir(siguiente);
    }
  };
  // Sin valor, la única parada de Tab es la primera estrella.
  const parada = valor || 1;
  return (
    <div className="estrellas-input-bloque">
      <span className="estrellas-input-etiqueta" id={idEtiqueta}>{etiqueta ?? t('resenas.calificacion')}</span>
      <div className="estrellas-input" role="radiogroup" aria-labelledby={idEtiqueta} aria-describedby={describedBy} onKeyDown={alTeclear}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={valor === n}
            aria-label={t('resenas.estrella', { count: n })}
            tabIndex={n === parada ? 0 : -1}
            ref={(el) => { refs.current[n - 1] = el; }}
            className="estrellas-input-boton"
            onClick={() => elegir(n)}
          >
            <Star size={30} strokeWidth={2} aria-hidden="true" className={n <= (valor || 0) ? 'estrella estrella--llena' : 'estrella'} />
          </button>
        ))}
      </div>
    </div>
  );
}
