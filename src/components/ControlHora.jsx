import { useEffect, useRef, useState } from 'react';
import { a24h, de24h, horaCorta } from '../utils/eventos';
import './ControlHora.css';

const HORAS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const MINUTOS = Array.from({ length: 12 }, (_, i) => i * 5);
const dos = (n) => String(n).padStart(2, '0');

// Control de hora propio (reemplaza <input type="time">): hora 1-12, minutos de 5 en 5 y AM | PM
// siempre visibles, con un resumen escrito debajo ("Empieza a las 7:00 PM").
//   value: '' o la hora guardada en 24 h ('19:00'). onChange recibe '' hasta que hay hora y AM/PM.
//   onIncompleto(true) avisa cuando ya se eligió la hora pero falta AM/PM (o al revés), para que el
//   formulario pueda decir qué falta en vez de perder lo elegido.
//   resumenCompleto: texto que reemplaza al resumen cuando hay hora (p. ej. "…del día siguiente").
//   etiqueta: título del grupo ("¿A qué hora empieza?"). verbo: "Empieza" / "Termina" para el resumen.
function ControlHora({ id, etiqueta, verbo, value, onChange, onIncompleto, resumenCompleto = '', invalido = false }) {
  const inicial = de24h(value);
  const [hora, setHora] = useState(inicial ? String(inicial.hora) : '');
  const [minutos, setMinutos] = useState(inicial ? inicial.minutos : 0);
  const [periodo, setPeriodo] = useState(inicial ? inicial.periodo : '');
  // Lo último que este control mandó hacia afuera: si el valor que llega es ese mismo, no hay nada que sincronizar.
  const emitido = useRef(value || '');

  // Si el valor cambia desde fuera (otra actividad cargada), el control lo sigue.
  useEffect(() => {
    if ((value || '') === emitido.current) return;
    emitido.current = value || '';
    const d = de24h(value);
    setHora(d ? String(d.hora) : '');
    setMinutos(d ? d.minutos : 0);
    setPeriodo(d ? d.periodo : '');
  }, [value]);

  const emitir = (h, m, p) => {
    const nuevo = h && p ? a24h(h, m, p) : '';
    emitido.current = nuevo;
    onChange(nuevo);
    onIncompleto?.(Boolean(h) !== Boolean(p));
  };

  const resumen = value
    ? (resumenCompleto || `${verbo} a las ${horaCorta(value)}`)
    : hora && !periodo ? 'Falta elegir AM o PM' : 'Elige la hora y AM o PM';
  const opcionesMinutos = MINUTOS.includes(minutos) ? MINUTOS : [...MINUTOS, minutos].sort((a, b) => a - b);

  return (
    <fieldset className="controlhora" aria-describedby={`${id}-resumen`}>
      <legend className="controlhora-etiqueta">{etiqueta}</legend>
      <div className="controlhora-fila">
        <select
          id={`${id}-hora`}
          className={`controlhora-select ${invalido && !hora ? 'controlhora-select--error' : ''}`}
          aria-label="Hora"
          value={hora}
          onChange={(e) => { setHora(e.target.value); emitir(e.target.value, minutos, periodo); }}
        >
          <option value="">Hora</option>
          {HORAS.map((h) => <option key={h} value={h}>{h}</option>)}
        </select>
        <span className="controlhora-dos-puntos" aria-hidden="true">:</span>
        <select
          id={`${id}-minutos`}
          className="controlhora-select"
          aria-label="Minutos"
          value={minutos}
          onChange={(e) => { setMinutos(Number(e.target.value)); emitir(hora, Number(e.target.value), periodo); }}
        >
          {opcionesMinutos.map((m) => <option key={m} value={m}>{dos(m)}</option>)}
        </select>
        <div className="controlhora-periodo" role="group" aria-label="AM o PM">
          {['AM', 'PM'].map((p) => (
            <button
              key={p}
              type="button"
              aria-pressed={periodo === p}
              className={`controlhora-periodo-btn ${periodo === p ? 'activo' : ''} ${invalido && !periodo ? 'controlhora-periodo-btn--error' : ''}`}
              onClick={() => { setPeriodo(p); emitir(hora, minutos, p); }}
            >
              {p}
            </button>
          ))}
        </div>
      </div>
      <p id={`${id}-resumen`} className={`controlhora-resumen ${value ? 'controlhora-resumen--lista' : ''}`}>
        {resumen}
      </p>
    </fieldset>
  );
}

export default ControlHora;
