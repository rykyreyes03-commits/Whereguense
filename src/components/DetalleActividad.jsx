import { useId, useState } from 'react';
import { Eye, Pencil, Trash2, QrCode, Lock, Send, Clock, CircleCheck, CircleX, TriangleAlert } from 'lucide-react';
import './DetalleActividad.css';
import PantallaFormulario from './PantallaFormulario';
import DetalleEvento from './DetalleEvento';
import BloqueQR from './BloqueQR';
import { eventoDesdeActividad, eventoTermino } from '../utils/eventos';
import { useAhora } from '../hooks/useAhora';
import { valorQRSello } from '../utils/qr';

const ESTADOS_SELLO = {
  pendiente: { texto: 'Sello en revisión', Icono: Clock, clase: 'pendiente' },
  aprobado: { texto: 'Sello aprobado', Icono: CircleCheck, clase: 'aprobado' },
  rechazado: { texto: 'Sello rechazado', Icono: CircleX, clase: 'rechazado' },
};

// Pantalla de una actividad del negocio: arriba "Así lo ven los turistas", con el mismo detalle que ve el turista,
// y abajo la barra de acciones (Editar, Eliminar y, con sello aprobado, Ver QR). Lo que solo le importa al dueño
// (estado del sello, avisos, reenvío) va debajo de esa vista previa.
//   entregados: sellos que ya entregó (si hay, no se puede eliminar); qr: { token, color } del sello aprobado.
//   onEditar / onEliminar: si no se pasan, el botón no se dibuja.
function DetalleActividad({
  actividad,
  organizador = null,
  qr = null,
  entregados = 0, // null: aún no se sabe
  aviso = '',
  onVolver,
  onEditar,
  onEliminar,
  onReenviarSello,
}) {
  const idAviso = useId();
  const ahora = useAhora();
  const [verQR, setVerQR] = useState(false);
  const [reenvio, setReenvio] = useState(null); // { original, texto }
  const [reenviando, setReenviando] = useState(false);

  const evento = eventoDesdeActividad(actividad, organizador ? { ...organizador, verificado: true } : null);
  const estadoSello = ESTADOS_SELLO[actividad.estado_sello];
  const sinFechas = !actividad.fecha_inicio || !actividad.fecha_fin;
  const finalizada = !sinFechas && eventoTermino(actividad, ahora);
  const aprobado = actividad.estado_sello === 'aprobado';
  const comprobando = entregados == null && Boolean(actividad.qr_sello_id);
  const puedeEliminar = !comprobando && !entregados;

  const handleReenviar = async (e) => {
    e.preventDefault();
    const texto = reenvio.texto.trim();
    if (!texto || texto === reenvio.original.trim()) return;

    setReenviando(true);
    const resultado = await onReenviarSello(actividad.id, texto);
    setReenviando(false);

    if (!resultado.exito) {
      window.alert(resultado.mensaje);
      return;
    }
    setReenvio(null);
  };

  const hayAcciones = Boolean(onEditar || onEliminar || (aprobado && qr && !finalizada));
  const barra = !hayAcciones ? null : (
    <div className="detact-barra">
      {onEditar && (
        <button type="button" className="detact-boton" onClick={onEditar}>
          <Pencil size={18} strokeWidth={2} aria-hidden="true" /> Editar
        </button>
      )}
      {onEliminar && (
        <button
          type="button"
          className={`detact-boton detact-boton--eliminar ${puedeEliminar ? '' : 'detact-boton--bloqueado'}`}
          aria-disabled={!puedeEliminar}
          aria-describedby={puedeEliminar ? undefined : idAviso}
          onClick={() => { if (puedeEliminar) onEliminar(); }}
        >
          <Trash2 size={18} strokeWidth={2} aria-hidden="true" /> Eliminar
        </button>
      )}
      {aprobado && qr && !finalizada && (
        <button type="button" className="detact-boton detact-boton--qr" onClick={() => setVerQR(true)}>
          <QrCode size={18} strokeWidth={2} aria-hidden="true" /> Ver QR
        </button>
      )}
    </div>
  );

  return (
    <>
      <PantallaFormulario titulo="Tu actividad" onVolver={onVolver} pie={barra} sinRelleno>
        <p className="detact-franja">
          <Eye size={18} strokeWidth={2} aria-hidden="true" /> {finalizada ? 'Así lo veían los turistas' : 'Así lo ven los turistas'}
        </p>

        {aviso && <p className="detact-aviso detact-aviso--ok" role="status">{aviso}</p>}

        {finalizada && (
          <p className="detact-aviso detact-aviso--info" role="status">
            Esta actividad ya terminó. Ya no aparece en Eventos y su sello ya no se puede canjear.
          </p>
        )}

        {sinFechas && (
          <p className="detact-aviso detact-aviso--info" role="status">
            No aparece en Eventos porque no tiene fechas. Edítala para publicarla.
          </p>
        )}

        {entregados > 0 && (
          <p className="detact-aviso detact-aviso--sellos" id={idAviso}>
            <Lock size={18} strokeWidth={2} aria-hidden="true" />
            <span>Ya entregó {entregados} {entregados === 1 ? 'sello' : 'sellos'}. Puedes editarla, pero no eliminarla.</span>
          </p>
        )}

        {comprobando && (
          <p className="detact-aviso detact-aviso--info" id={idAviso} role="status">Comprobando si ya entregó sellos…</p>
        )}

        <DetalleEvento evento={evento} modoDuenio />

        <div className="detact-extras">
          {estadoSello && (
            <section className="detact-sello" aria-label="Sello de la actividad">
              <span className={`generarqr-estado generarqr-estado--${estadoSello.clase}`}>
                <estadoSello.Icono size={14} strokeWidth={2.2} aria-hidden="true" /> {estadoSello.texto}
              </span>
              {actividad.limite_canjes != null && <span className="detact-sello-dato">Límite: {actividad.limite_canjes} canjes</span>}
              {actividad.estado_sello === 'rechazado' && actividad.motivo_rechazo_sello && (
                <p className="detact-sello-motivo">Motivo: {actividad.motivo_rechazo_sello}</p>
              )}

              {actividad.estado_sello === 'rechazado' && !reenvio && onReenviarSello && (
                <button
                  type="button"
                  className="generarqr-accion"
                  onClick={() => setReenvio({ original: actividad.justificacion_sello || '', texto: actividad.justificacion_sello || '' })}
                >
                  Editar y volver a enviar
                </button>
              )}

              {reenvio && (() => {
                const sinCambios = reenvio.texto.trim() === reenvio.original.trim();
                return (
                  <form className="generarqr-reenvio" onSubmit={handleReenviar} noValidate>
                    <label className="generarqr-campo">
                      <span>Cuéntanos para qué lo vas a usar</span>
                      <textarea
                        className="generarqr-input generarqr-textarea"
                        maxLength={2000}
                        rows={4}
                        value={reenvio.texto}
                        onChange={(e) => setReenvio({ ...reenvio, texto: e.target.value })}
                        autoFocus
                      />
                      <small>
                        {sinCambios
                          ? 'Corrige la explicación según el motivo del rechazo para poder enviarla.'
                          : 'Se enviará de nuevo al administrador para su revisión.'}
                      </small>
                    </label>
                    <div className="generarqr-acciones">
                      <button type="button" className="generarqr-accion" onClick={() => setReenvio(null)} disabled={reenviando}>
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        className="generarqr-accion generarqr-accion--primaria"
                        disabled={reenviando || sinCambios || !reenvio.texto.trim()}
                      >
                        <Send size={16} strokeWidth={2} aria-hidden="true" /> {reenviando ? 'Enviando...' : 'Volver a enviar'}
                      </button>
                    </div>
                  </form>
                );
              })()}

              {aprobado && (
                <p className="detact-nota">
                  <TriangleAlert size={16} strokeWidth={2} aria-hidden="true" />
                  <span>Al editar, las fechas y el límite de canjes quedan bloqueados porque el sello ya fue aprobado.</span>
                </p>
              )}
            </section>
          )}
        </div>
      </PantallaFormulario>

      {verQR && qr && !finalizada && (
        <PantallaFormulario titulo="QR del sello" onVolver={() => setVerQR(false)}>
          <h2 className="detact-qr-titulo">{actividad.nombre}</h2>
          <BloqueQR valor={valorQRSello(qr.token)} color={qr.color} nombreArchivo={`sello-qr-${actividad.nombre}`} />
        </PantallaFormulario>
      )}
    </>
  );
}

export default DetalleActividad;
