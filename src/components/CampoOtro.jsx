import { MAX_CATEGORIA_OTRO } from '../utils/eventos';
import './CampoOtro.css';

// "¿Cuál?": aparece al elegir "Otro" en una lista de categorías. Obligatorio, máximo 40 caracteres,
// con contador. claseInput lo deja con el mismo aspecto que los demás campos del formulario donde se use.
function CampoOtro({ id, value, onChange, claseInput = '', placeholder = 'Escribe la categoría', autoFocus = false }) {
  return (
    <div className="campo-otro">
      <label className="campo-otro-etiqueta" htmlFor={id}>¿Cuál?</label>
      <input
        id={id}
        type="text"
        className={`campo-otro-input ${claseInput}`}
        placeholder={placeholder}
        maxLength={MAX_CATEGORIA_OTRO}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-required="true"
        autoFocus={autoFocus}
      />
      <small className="campo-otro-contador" aria-live="off">{value.length}/{MAX_CATEGORIA_OTRO}</small>
    </div>
  );
}

export default CampoOtro;
