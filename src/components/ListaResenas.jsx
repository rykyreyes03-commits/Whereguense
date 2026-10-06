import { useState } from 'react';
import { MessageSquareReply } from 'lucide-react';
import PantallaFormulario from './PantallaFormulario';
import { EstrellasValor } from './Estrellas';
import { fechaCorta } from '../utils/resenas';
import './ListaResenas.css';

const MAX_RESPUESTA = 2000;

// Pantalla para que el dueño escriba o edite su respuesta a una reseña.
function FormularioRespuesta({ resena, onGuardar, onCerrar }) {
  const [texto, setTexto] = useState(resena.respuesta || '');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const vacia = texto.trim().length === 0;

  const enviar = async () => {
    if (vacia || enviando) return;
    setEnviando(true);
    setError('');
    const r = await onGuardar(resena.id, texto);
    setEnviando(false);
    if (r?.exito) onCerrar();
    else setError(r?.mensaje || 'No se pudo guardar tu respuesta. Intenta de nuevo.');
  };

  return (
    <PantallaFormulario
      titulo={resena.respuesta ? 'Editar respuesta' : 'Responder reseña'}
      onVolver={onCerrar}
      pie={(
        <button type="button" className="resenas-boton-principal" onClick={enviar} aria-disabled={vacia || enviando}>
          {enviando ? 'Guardando…' : resena.respuesta ? 'Guardar respuesta' : 'Publicar respuesta'}
        </button>
      )}
    >
      <div className="resenas-form">
        <blockquote className="resenas-cita">
          <EstrellasValor valor={resena.calificacion} />
          <p>{resena.comentario}</p>
          <span>{resena.autor} · {fechaCorta(resena.fecha)}</span>
        </blockquote>
        <label className="resenas-campo">
          <span>Tu respuesta</span>
          <textarea
            value={texto}
            maxLength={MAX_RESPUESTA}
            rows={6}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Agradece, aclara o cuéntale qué hiciste al respecto."
            aria-describedby="resenas-respuesta-ayuda"
          />
          <small id="resenas-respuesta-ayuda">{texto.length} de {MAX_RESPUESTA}. Todos la verán debajo de la reseña.</small>
        </label>
        {error && <p className="resenas-error" role="alert">{error}</p>}
      </div>
    </PantallaFormulario>
  );
}

// Lista de reseñas, más recientes primero. Con onResponder (panel del emprendedor) cada reseña trae el botón
// "Responder" o "Editar respuesta".
function ListaResenas({ resenas, onResponder = null, vacio = 'Aún sin reseñas.' }) {
  const [respondiendo, setRespondiendo] = useState(null);

  if (resenas.length === 0) return <p className="resenas-vacio">{vacio}</p>;

  return (
    <>
      <ul className="resenas-lista">
        {resenas.map((r) => (
          <li key={r.id} className={`resenas-item ${r.esMia ? 'resenas-item--mia' : ''}`}>
            <div className="resenas-item-cabecera">
              <EstrellasValor valor={r.calificacion} />
              <span className="resenas-item-meta">
                {r.esMia ? 'Tú' : r.autor} · {fechaCorta(r.fecha)}
              </span>
            </div>
            <p className="resenas-item-texto">{r.comentario}</p>
            {r.respuesta && (
              <div className="resenas-respuesta">
                <strong>Respuesta del negocio</strong>
                <p>{r.respuesta}</p>
                {r.fechaRespuesta && <span>{fechaCorta(r.fechaRespuesta)}</span>}
              </div>
            )}
            {onResponder && (
              <button type="button" className="resenas-boton-secundario" onClick={() => setRespondiendo(r)}>
                <MessageSquareReply size={16} strokeWidth={2} aria-hidden="true" />
                {r.respuesta ? 'Editar respuesta' : 'Responder'}
              </button>
            )}
          </li>
        ))}
      </ul>
      {respondiendo && (
        <FormularioRespuesta resena={respondiendo} onGuardar={onResponder} onCerrar={() => setRespondiendo(null)} />
      )}
    </>
  );
}

export default ListaResenas;
