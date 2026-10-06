import { useState } from 'react';
import { Star } from 'lucide-react';
import PantallaFormulario from './PantallaFormulario';
import ListaResenas from './ListaResenas';
import { EstrellasInput, EstrellasValor } from './Estrellas';
import { textoCantidad, textoPromedio } from '../utils/resenas';
import { useResenas } from '../hooks/useResenas';
import './ListaResenas.css';

const MIN = 10;
const MAX = 2000;

function FormularioResena({ miResena, nombreNegocio, onGuardar, onCerrar }) {
  const [calificacion, setCalificacion] = useState(miResena?.calificacion || 0);
  const [comentario, setComentario] = useState(miResena?.comentario || '');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const largo = comentario.trim().length;
  const completa = calificacion >= 1 && largo >= MIN;

  const enviar = async () => {
    if (enviando) return;
    if (calificacion < 1) { setError('Elige de 1 a 5 estrellas.'); return; }
    if (largo < MIN) { setError(`Escribe un comentario de al menos ${MIN} caracteres.`); return; }
    setEnviando(true);
    setError('');
    const r = await onGuardar(calificacion, comentario);
    setEnviando(false);
    if (r?.exito) onCerrar();
    else setError(r?.mensaje || 'No se pudo guardar tu reseña. Intenta de nuevo.');
  };

  return (
    <PantallaFormulario
      titulo={miResena ? 'Editar mi reseña' : 'Escribir reseña'}
      onVolver={onCerrar}
      pie={(
        <button type="button" className="resenas-boton-principal" onClick={enviar} aria-disabled={!completa || enviando}>
          {enviando ? 'Guardando…' : miResena ? 'Guardar cambios' : 'Publicar reseña'}
        </button>
      )}
    >
      <div className="resenas-form">
        <p className="resenas-form-negocio">{nombreNegocio}</p>
        <EstrellasInput valor={calificacion} onCambiar={setCalificacion} />
        <label className="resenas-campo">
          <span>Tu comentario</span>
          <textarea
            value={comentario}
            maxLength={MAX}
            rows={7}
            onChange={(e) => setComentario(e.target.value)}
            placeholder="Cuenta cómo fue tu visita: la atención, el lugar, lo que probaste."
            aria-describedby="resenas-comentario-ayuda"
          />
          <small id="resenas-comentario-ayuda">
            {largo < MIN ? `Escribe al menos ${MIN} caracteres (${largo} de ${MIN}).` : `${comentario.length} de ${MAX}.`}
          </small>
        </label>
        {error && <p className="resenas-error" role="alert">{error}</p>}
      </div>
    </PantallaFormulario>
  );
}

// Reseñas de un negocio en su ficha pública: resumen, lista y, si corresponde, escribir o editar la propia.
// vistaPrevia: el dueño mirando su propia ficha (sin botón ni aviso de sello).
function SeccionResenas({ negocioId, nombreNegocio, vistaPrevia = false }) {
  const { resumen, resenas, puedeResenar, haySesion, cargando, error, guardar } = useResenas(negocioId);
  const [escribiendo, setEscribiendo] = useState(false);

  if (cargando) return null;
  const miResena = resenas.find((r) => r.esMia) || null;
  const total = resumen?.total || 0;

  return (
    <div className="perfilpublico-card resenas-seccion">
      <h3 className="perfilpublico-seccion-titulo">Reseñas</h3>
      {error ? (
        <p className="resenas-error" role="alert">{error}</p>
      ) : (
        <>
          <p className="resenas-resumen">
            {total > 0 ? (
              <>
                <EstrellasValor valor={resumen.promedio} />
                <strong>{textoPromedio(resumen.promedio)}</strong>
                <span>· {textoCantidad(total)}</span>
              </>
            ) : (
              <>
                <Star size={16} strokeWidth={2} aria-hidden="true" className="estrella" />
                <span>Aún sin reseñas</span>
              </>
            )}
          </p>

          {!vistaPrevia && puedeResenar && (
            <button type="button" className="resenas-boton-principal resenas-boton-ancho" onClick={() => setEscribiendo(true)}>
              {miResena ? 'Editar mi reseña' : 'Escribir reseña'}
            </button>
          )}
          {!vistaPrevia && haySesion && !puedeResenar && !miResena && (
            <p className="resenas-aviso">Escanea el sello de este negocio para poder dejar tu reseña.</p>
          )}

          {total > 0 && <ListaResenas resenas={resenas} />}
        </>
      )}
      {escribiendo && (
        <FormularioResena miResena={miResena} nombreNegocio={nombreNegocio} onGuardar={guardar} onCerrar={() => setEscribiendo(false)} />
      )}
    </div>
  );
}

export default SeccionResenas;
