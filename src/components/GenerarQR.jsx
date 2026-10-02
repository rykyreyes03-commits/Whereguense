import { useEffect, useRef, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { Trash2, Download, Printer, CalendarDays, Clock, CircleCheck, CircleX, Plus, Send } from 'lucide-react';
import './GenerarQR.css';
import TopBar from './TopBar';

const ESTADOS_SELLO = {
  pendiente: { texto: 'Sello en revisión', Icono: Clock, clase: 'pendiente' },
  aprobado: { texto: 'Sello aprobado', Icono: CircleCheck, clase: 'aprobado' },
  rechazado: { texto: 'Sello rechazado', Icono: CircleX, clase: 'rechazado' },
};

function formatearFecha(fechaISO) {
  return new Date(`${fechaISO}T00:00:00`).toLocaleDateString('es-NI', { day: 'numeric', month: 'short', year: 'numeric' });
}

function textoFechas(actividad) {
  if (!actividad.fecha_inicio) return 'Sin fechas · no aparece en Eventos';
  if (actividad.fecha_inicio === actividad.fecha_fin) return formatearFecha(actividad.fecha_inicio);
  return `${formatearFecha(actividad.fecha_inicio)} – ${formatearFecha(actividad.fecha_fin)}`;
}

// Formulario y lista de actividades del negocio (pestaña "Sellos" de PerfilNegocio).
// Una actividad puede pedir un sello: el admin lo aprueba y recién ahí existe el QR.
// Los QR creados antes de las actividades (crear_actividad_qr) se listan aparte.
// embebido: se dibuja dentro de la pestaña (sin barra superior ni pantalla completa).
function GenerarQR({
  actividades = [],
  actividadesQR = [],
  onRecargar,
  onCrearActividad,
  onReenviarSello,
  onEliminarActividad,
  onNavigate,
  embebido = false,
}) {
  const areaRef = useRef(null);
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [quiereSello, setQuiereSello] = useState(false);
  const [justificacion, setJustificacion] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [expandidoId, setExpandidoId] = useState(null);
  // Reenvío de un sello rechazado: una actividad a la vez.
  const [reenvio, setReenvio] = useState(null); // { id, original, texto }
  const [reenviando, setReenviando] = useState(false);

  // Al abrir la pestaña: traer de nuevo, por si el admin aprobó o rechazó algo.
  useEffect(() => {
    onRecargar?.();
  }, [onRecargar]);

  const qrPorId = new Map(actividadesQR.map((qr) => [qr.id, qr]));
  const idsConActividad = new Set(actividades.map((a) => a.qr_sello_id).filter(Boolean));
  const sellosAnteriores = actividadesQR.filter((qr) => !idsConActividad.has(qr.id));

  const hoy = new Date().toISOString().slice(0, 10);
  const soloUnaFecha = Boolean(fechaInicio) !== Boolean(fechaFin);
  const fechasDesordenadas = fechaInicio && fechaFin && fechaFin < fechaInicio;
  const faltaJustificacion = quiereSello && !justificacion.trim();
  const puedeEnviar = nombre.trim() && !soloUnaFecha && !fechasDesordenadas && !faltaJustificacion && !guardando;

  const limpiarFormulario = () => {
    setNombre('');
    setDescripcion('');
    setFechaInicio('');
    setFechaFin('');
    setQuiereSello(false);
    setJustificacion('');
  };

  const handleCrear = async (e) => {
    e.preventDefault();
    if (!puedeEnviar) return;

    setGuardando(true);
    const resultado = await onCrearActividad({
      nombre: nombre.trim(),
      descripcion: descripcion.trim(),
      fechaInicio: fechaInicio || null,
      fechaFin: fechaFin || null,
      solicitaSello: quiereSello,
      justificacion: justificacion.trim(),
    });
    setGuardando(false);

    if (!resultado.exito) {
      window.alert(resultado.mensaje);
      return;
    }
    if (resultado.aviso) window.alert(resultado.aviso);
    limpiarFormulario();
  };

  const handleReenviar = async (e) => {
    e.preventDefault();
    const texto = reenvio.texto.trim();
    if (!texto || texto === reenvio.original.trim()) return;

    setReenviando(true);
    const resultado = await onReenviarSello(reenvio.id, texto);
    setReenviando(false);

    if (!resultado.exito) {
      window.alert(resultado.mensaje);
      return;
    }
    setReenvio(null);
  };

  const handleEliminar = async (id) => {
    const resultado = await onEliminarActividad(id);
    if (!resultado.exito) {
      window.alert(resultado.mensaje);
      return;
    }
    if (expandidoId === id) setExpandidoId(null);
  };

  const handleDescargar = (nombreArchivo) => {
    const canvas = areaRef.current?.querySelector('canvas');
    if (!canvas) return;
    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    link.download = `sello-qr-${nombreArchivo}.png`;
    link.click();
  };

  // QR desplegable (mismo para sellos aprobados y sellos anteriores)
  const renderQR = (qr, nombreArchivo) => (
    <>
      <div className="generarqr-qr-area" ref={areaRef}>
        <QRCodeCanvas value={`WHEREGUENSE-QR:${qr.token}`} size={200} fgColor={qr.color} level="M" includeMargin />
      </div>
      <div className="generarqr-acciones">
        <button className="generarqr-accion" onClick={() => handleDescargar(nombreArchivo)} type="button">
          <Download size={16} strokeWidth={2} aria-hidden="true" /> Descargar
        </button>
        <button className="generarqr-accion" onClick={() => window.print()} type="button">
          <Printer size={16} strokeWidth={2} aria-hidden="true" /> Imprimir
        </button>
      </div>
    </>
  );

  const contenido = (
    <div className={`generarqr-contenido ${embebido ? 'generarqr-contenido--embebido' : ''}`}>
      <h1 className="generarqr-titulo">Actividades</h1>

      {actividades.length > 0 ? (
        <div className="generarqr-lista">
          {actividades.map((actividad) => {
            const estado = ESTADOS_SELLO[actividad.estado_sello];
            const qr = actividad.qr_sello_id ? qrPorId.get(actividad.qr_sello_id) : null;
            const clave = `actividad-${actividad.id}`;
            const expandido = expandidoId === clave;
            return (
              <div key={clave} className="generarqr-item">
                <div className="generarqr-item-info">
                  <strong>{actividad.nombre}</strong>
                  <span className="generarqr-item-fechas">
                    <CalendarDays size={14} strokeWidth={2} aria-hidden="true" /> {textoFechas(actividad)}
                  </span>
                  {actividad.descripcion && <p className="generarqr-item-desc">{actividad.descripcion}</p>}
                </div>

                {estado && (
                  <span className={`generarqr-estado generarqr-estado--${estado.clase}`}>
                    <estado.Icono size={14} strokeWidth={2.2} aria-hidden="true" /> {estado.texto}
                  </span>
                )}
                {actividad.estado_sello === 'rechazado' && actividad.motivo_rechazo_sello && (
                  <p className="generarqr-motivo">Motivo: {actividad.motivo_rechazo_sello}</p>
                )}

                {actividad.estado_sello === 'rechazado' && reenvio?.id !== actividad.id && (
                  <div className="generarqr-item-acciones">
                    <button
                      type="button"
                      className="generarqr-accion"
                      onClick={() => setReenvio({
                        id: actividad.id,
                        original: actividad.justificacion_sello || '',
                        texto: actividad.justificacion_sello || '',
                      })}
                    >
                      Editar y volver a enviar
                    </button>
                  </div>
                )}

                {reenvio?.id === actividad.id && (() => {
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
                        <button
                          type="button"
                          className="generarqr-accion"
                          onClick={() => setReenvio(null)}
                          disabled={reenviando}
                        >
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

                {qr && (
                  <div className="generarqr-item-acciones">
                    <button
                      type="button"
                      className="generarqr-accion"
                      onClick={() => setExpandidoId(expandido ? null : clave)}
                    >
                      {expandido ? 'Ocultar QR' : 'Ver QR'}
                    </button>
                  </div>
                )}
                {qr && expandido && renderQR(qr, actividad.nombre)}
              </div>
            );
          })}
        </div>
      ) : (
        <p className="generarqr-vacio">Aún no tienes actividades. Crea la primera abajo.</p>
      )}

      {sellosAnteriores.length > 0 && (
        <>
          <h2 className="generarqr-subtitulo">Sellos anteriores</h2>
          <div className="generarqr-lista">
            {sellosAnteriores.map((qr) => {
              const clave = `qr-${qr.id}`;
              const expandido = expandidoId === clave;
              return (
                <div key={clave} className="generarqr-item">
                  <div className="generarqr-item-info">
                    <strong>{qr.nombre_actividad}</strong>
                    <span>{qr.limite_canjes ? `Límite: ${qr.limite_canjes} canjes` : 'Sin límite de canjes'}</span>
                    {qr.fecha_expiracion && (
                      <span>Vence: {new Date(qr.fecha_expiracion).toLocaleDateString('es-NI')}</span>
                    )}
                  </div>
                  <div className="generarqr-item-acciones">
                    <button
                      type="button"
                      className="generarqr-accion"
                      onClick={() => setExpandidoId(expandido ? null : clave)}
                    >
                      {expandido ? 'Ocultar QR' : 'Ver QR'}
                    </button>
                    <button
                      type="button"
                      className="generarqr-item-eliminar"
                      onClick={() => handleEliminar(qr.id)}
                      aria-label={`Eliminar ${qr.nombre_actividad}`}
                    >
                      <Trash2 size={18} strokeWidth={1.8} aria-hidden="true" />
                    </button>
                  </div>
                  {expandido && renderQR(qr, qr.nombre_actividad)}
                </div>
              );
            })}
          </div>
        </>
      )}

      <form className="generarqr-form" onSubmit={handleCrear} noValidate>
        <h2 className="generarqr-subtitulo">Nueva actividad</h2>

        <label className="generarqr-campo">
          <span>Nombre</span>
          <input
            type="text"
            className="generarqr-input"
            placeholder="Ej. Degustación de café"
            maxLength={120}
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
          />
        </label>

        <label className="generarqr-campo">
          <span>Descripción <em>(opcional)</em></span>
          <textarea
            className="generarqr-input generarqr-textarea"
            placeholder="¿De qué se trata?"
            maxLength={2000}
            rows={3}
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
          />
        </label>

        <div className="generarqr-fechas">
          <label className="generarqr-campo">
            <span>Inicio</span>
            <input
              type="date"
              className="generarqr-input"
              min={hoy}
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
            />
          </label>
          <label className="generarqr-campo">
            <span>Fin</span>
            <input
              type="date"
              className="generarqr-input"
              min={fechaInicio || hoy}
              value={fechaFin}
              onChange={(e) => setFechaFin(e.target.value)}
            />
          </label>
        </div>
        <p className={`generarqr-ayuda ${soloUnaFecha || fechasDesordenadas ? 'generarqr-ayuda--error' : ''}`}>
          {fechasDesordenadas
            ? 'La fecha de fin no puede ser anterior a la de inicio.'
            : soloUnaFecha
              ? 'Completa las dos fechas, o deja ambas vacías.'
              : 'Opcional. Con fechas, la actividad aparece en Eventos y en tu ficha pública.'}
        </p>

        <div className="generarqr-sello">
          <span id="generarqr-sello-etiqueta">¿Quieres un sello de negocio para esta actividad?</span>
          <button
            type="button"
            role="switch"
            aria-checked={quiereSello}
            aria-labelledby="generarqr-sello-etiqueta"
            className={`generarqr-switch ${quiereSello ? 'generarqr-switch--activo' : ''}`}
            onClick={() => setQuiereSello((v) => !v)}
          >
            <span className="generarqr-switch-perilla" />
          </button>
        </div>

        {quiereSello && (
          <label className="generarqr-campo generarqr-justificacion">
            <span>Cuéntanos para qué lo vas a usar</span>
            <textarea
              className="generarqr-input generarqr-textarea"
              placeholder="Ej. Los visitantes que prueben el café del día reciben el sello."
              maxLength={2000}
              rows={3}
              value={justificacion}
              onChange={(e) => setJustificacion(e.target.value)}
            />
            <small>Un administrador revisa la solicitud. Cuando la apruebe, el QR aparece aquí.</small>
          </label>
        )}

        <button className="generarqr-generar-btn" disabled={!puedeEnviar} type="submit">
          {guardando ? 'Guardando...' : (
            <>
              <Plus size={18} strokeWidth={2.2} aria-hidden="true" /> Crear actividad
            </>
          )}
        </button>
      </form>
    </div>
  );

  if (embebido) return contenido;

  return (
    <div className="generarqr-wrapper">
      <TopBar title="Actividades" onBack={() => onNavigate('perfilNegocio')} />
      {contenido}
    </div>
  );
}

export default GenerarQR;
