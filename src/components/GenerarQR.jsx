import { useEffect, useRef, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { Trash2, Download, Printer, Clock, CircleCheck, CircleX, Plus, Send, ChevronDown, MapPin, Ticket } from 'lucide-react';
import './GenerarQR.css';
import TopBar from './TopBar';
import CuponesNegocio from './CuponesNegocio';
import FilaCompacta from './FilaCompacta';
import FormularioActividad from './FormularioActividad';
import { textoCategoria, rangoEscrito, rangoHoras, notaDiaSiguiente, inicialDe } from '../utils/eventos';

const ESTADOS_SELLO = {
  pendiente: { texto: 'Sello en revisión', Icono: Clock, clase: 'pendiente' },
  aprobado: { texto: 'Sello aprobado', Icono: CircleCheck, clase: 'aprobado' },
  rechazado: { texto: 'Sello rechazado', Icono: CircleX, clase: 'rechazado' },
};

// Etiqueta de la fila: sin sello la actividad ya está publicada; con sello depende de la revisión del admin.
function estadoDeActividad(actividad) {
  if (actividad.solicita_sello && actividad.estado_sello === 'pendiente') return { texto: 'En revisión', tono: 'revision' };
  if (actividad.solicita_sello && actividad.estado_sello === 'rechazado') return { texto: 'Rechazada', tono: 'rechazada' };
  return { texto: 'Publicada', tono: 'publicada' };
}

// Pestaña "Actividades" de PerfilNegocio: un selector Actividades | Cupones y, debajo, una sola vista a la
// vez. Cada vista es una lista compacta con un botón grande para crear; el formulario abre en su propia
// pantalla. Una actividad puede pedir un sello: el admin lo aprueba y recién ahí existe el QR.
// Los QR creados antes de las actividades (crear_actividad_qr) quedan plegados al final como "Sellos anteriores".
// embebido: se dibuja dentro de la pestaña (sin barra superior ni pantalla completa).
function GenerarQR({
  actividades = [],
  actividadesQR = [],
  onRecargar,
  onCrearActividad,
  onReenviarSello,
  onEliminarActividad,
  onNavigate,
  negocioId,
  organizador = null, // { nombre, logoUrl }: sale en la vista previa de la tarjeta
  embebido = false,
}) {
  const areaRef = useRef(null);
  const [vista, setVista] = useState('actividades'); // 'actividades' | 'cupones'
  const [creando, setCreando] = useState(false);
  const [aviso, setAviso] = useState('');
  const [expandidoId, setExpandidoId] = useState(null);
  const [sellosAbiertos, setSellosAbiertos] = useState(false);
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
    if (expandidoId === `qr-${id}`) setExpandidoId(null);
  };

  const handleDescargar = (nombreArchivo) => {
    const canvas = areaRef.current?.querySelector('canvas');
    if (!canvas) return;
    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    link.download = `sello-qr-${nombreArchivo}.png`;
    link.click();
  };

  // QR (mismo para sellos aprobados y sellos anteriores)
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

  const alternar = (clave) => setExpandidoId(expandidoId === clave ? null : clave);

  const renderDetalleActividad = (actividad) => {
    const estadoSello = ESTADOS_SELLO[actividad.estado_sello];
    const qr = actividad.qr_sello_id ? qrPorId.get(actividad.qr_sello_id) : null;
    const horas = rangoHoras(actividad.hora_inicio, actividad.hora_fin);
    const nota = notaDiaSiguiente(actividad.hora_inicio, actividad.hora_fin);
    const categoria = textoCategoria(actividad.categoria, actividad.categoria_otro);
    return (
      <>
        {actividad.descripcion && <p className="generarqr-item-desc">{actividad.descripcion}</p>}
        <ul className="generarqr-datos">
          {categoria && <li>{categoria}</li>}
          {actividad.lugar && <li><MapPin size={14} strokeWidth={2} aria-hidden="true" /> {actividad.lugar}</li>}
          {horas && <li><Clock size={14} strokeWidth={2} aria-hidden="true" /> {horas}</li>}
          {actividad.solicita_sello && (
            <li>
              <Ticket size={14} strokeWidth={2} aria-hidden="true" />
              {actividad.limite_canjes ? `Límite: ${actividad.limite_canjes} canjes` : 'Sin límite de canjes'}
            </li>
          )}
        </ul>
        {nota && <p className="generarqr-motivo">{nota}</p>}

        {estadoSello && (
          <span className={`generarqr-estado generarqr-estado--${estadoSello.clase}`}>
            <estadoSello.Icono size={14} strokeWidth={2.2} aria-hidden="true" /> {estadoSello.texto}
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

        {qr && renderQR(qr, actividad.nombre)}
      </>
    );
  };

  const vistaActividades = (
    <>
      {aviso && <p className="generarqr-aviso" role="status">{aviso}</p>}

      {actividades.length > 0 ? (
        <ul className="fila-compacta-lista">
          {actividades.map((actividad) => {
            const clave = `actividad-${actividad.id}`;
            return (
              <FilaCompacta
                key={clave}
                id={clave}
                miniatura={actividad.foto_url
                  ? <img src={actividad.foto_url} alt="" loading="lazy" />
                  : inicialDe(actividad.nombre)}
                titulo={actividad.nombre}
                subtitulo={actividad.fecha_inicio ? rangoEscrito(actividad.fecha_inicio, actividad.fecha_fin) : 'Sin fechas'}
                estado={estadoDeActividad(actividad)}
                abierta={expandidoId === clave}
                onAlternar={() => alternar(clave)}
              >
                {renderDetalleActividad(actividad)}
              </FilaCompacta>
            );
          })}
        </ul>
      ) : (
        <p className="generarqr-vacio">Aún no tienes actividades. Publica la primera con el botón de abajo.</p>
      )}

      <button type="button" className="generarqr-nuevo" onClick={() => { setAviso(''); setCreando(true); }}>
        <Plus size={18} strokeWidth={2.4} aria-hidden="true" /> Nueva actividad
      </button>

      {sellosAnteriores.length > 0 && (
        <div className="generarqr-anteriores">
          <button
            type="button"
            className="generarqr-anteriores-toggle"
            aria-expanded={sellosAbiertos}
            aria-controls={sellosAbiertos ? 'sellos-anteriores' : undefined}
            onClick={() => setSellosAbiertos((v) => !v)}
          >
            Sellos anteriores ({sellosAnteriores.length})
            <ChevronDown size={16} strokeWidth={2.2} aria-hidden="true" className={sellosAbiertos ? 'girada' : ''} />
          </button>
          {sellosAbiertos && (
            <ul className="fila-compacta-lista" id="sellos-anteriores">
              {sellosAnteriores.map((qr) => {
                const clave = `qr-${qr.id}`;
                return (
                  <FilaCompacta
                    key={clave}
                    id={clave}
                    miniatura={<Ticket size={20} strokeWidth={1.8} aria-hidden="true" />}
                    titulo={qr.nombre_actividad}
                    subtitulo={qr.fecha_expiracion
                      ? `Vence: ${new Date(qr.fecha_expiracion).toLocaleDateString('es-NI')}`
                      : (qr.limite_canjes ? `Límite: ${qr.limite_canjes} canjes` : 'Sin límite de canjes')}
                    abierta={expandidoId === clave}
                    onAlternar={() => alternar(clave)}
                  >
                    {renderQR(qr, qr.nombre_actividad)}
                    <div className="generarqr-item-acciones">
                      <button
                        type="button"
                        className="generarqr-item-eliminar"
                        onClick={() => handleEliminar(qr.id)}
                        aria-label={`Eliminar ${qr.nombre_actividad}`}
                      >
                        <Trash2 size={18} strokeWidth={1.8} aria-hidden="true" /> Eliminar
                      </button>
                    </div>
                  </FilaCompacta>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </>
  );

  const contenido = (
    <section className="generarqr-seccion" aria-label="Actividades y cupones">
      <div className="generarqr-selector" role="group" aria-label="Qué quieres ver">
        {[['actividades', 'Actividades'], ['cupones', 'Cupones']].map(([id, texto]) => (
          <button
            key={id}
            type="button"
            className={`generarqr-selector-opcion ${vista === id ? 'activa' : ''}`}
            aria-pressed={vista === id}
            onClick={() => { setVista(id); setAviso(''); }}
          >
            {texto}
          </button>
        ))}
      </div>

      {vista === 'actividades' && vistaActividades}
      {vista === 'cupones' && (negocioId
        ? <CuponesNegocio negocioId={negocioId} />
        : <p className="generarqr-vacio">No encontramos tu negocio. Vuelve a abrir tu panel.</p>)}

      {creando && (
        <FormularioActividad
          organizador={organizador}
          onCrear={onCrearActividad}
          onSalir={() => setCreando(false)}
          onCerrar={(resultado) => { setCreando(false); setAviso(resultado?.aviso || 'Tu actividad quedó guardada.'); }}
        />
      )}
    </section>
  );

  if (embebido) return contenido;

  return (
    <div className="generarqr-wrapper">
      <TopBar title="Actividades y cupones" onBack={() => onNavigate('perfilNegocio')} />
      <div className="generarqr-bloques">{contenido}</div>
    </div>
  );
}

export default GenerarQR;
