import { useEffect, useRef, useState } from 'react';
import { Trash2, Plus, ChevronDown, Ticket } from 'lucide-react';
import './GenerarQR.css';
import TopBar from './TopBar';
import CuponesNegocio from './CuponesNegocio';
import FilaCompacta from './FilaCompacta';
import FormularioActividad from './FormularioActividad';
import DetalleActividad from './DetalleActividad';
import DialogoConfirmacion from './DialogoConfirmacion';
import BloqueQR from './BloqueQR';
import { rangoEscrito, inicialDe, eventoTermino } from '../utils/eventos';
import { useAhora } from '../hooks/useAhora';

// Etiqueta de la fila: una actividad que terminó es "Finalizada"; sin sello la actividad ya está publicada; con sello
// depende de la revisión del admin.
function estadoDeActividad(actividad, finalizada) {
  if (finalizada) return { texto: 'Finalizada', tono: 'inactiva' };
  if (actividad.solicita_sello && actividad.estado_sello === 'pendiente') return { texto: 'En revisión', tono: 'revision' };
  if (actividad.solicita_sello && actividad.estado_sello === 'rechazado') return { texto: 'Rechazada', tono: 'rechazada' };
  return { texto: 'Publicada', tono: 'publicada' };
}

// Pestaña "Actividades" de PerfilNegocio: un selector Actividades | Cupones y, debajo, una sola vista a la
// vez. Cada vista es una lista compacta con un botón grande para crear. Al tocar una actividad se abre su
// pantalla (el mismo detalle que ve el turista); el formulario de crear también abre en su propia pantalla.
// Los QR creados antes de las actividades (crear_actividad_qr) quedan plegados al final como "Sellos anteriores".
// embebido: se dibuja dentro de la pestaña (sin barra superior ni pantalla completa).
function GenerarQR({
  actividades = [],
  actividadesQR = [],
  sellosEntregados = null, // { [actividadId]: cuántos sellos entregó }; null mientras se cargan
  onRecargar,
  onCrearActividad,
  onEditarActividad,
  onBorrarActividad, // elimina la actividad completa (sello, evento y favoritos)
  onReenviarSello,
  onEliminarActividad, // borra un QR suelto de "Sellos anteriores"
  onNavigate,
  negocioId,
  organizador = null, // { nombre, logoUrl }: sale en la vista previa de la tarjeta
  embebido = false,
}) {
  const [vista, setVista] = useState('actividades'); // 'actividades' | 'cupones'
  const [creando, setCreando] = useState(false);
  const [detalleId, setDetalleId] = useState(null); // actividad abierta en su pantalla
  const [aviso, setAviso] = useState('');
  const [editandoId, setEditandoId] = useState(null); // actividad abierta en el formulario de edición
  const [avisoDetalle, setAvisoDetalle] = useState('');
  // La ventana de eliminar recuerda a qué actividad se refiere: no depende de que la pantalla de detalle siga abierta.
  const [porEliminar, setPorEliminar] = useState(null); // { id, conSello }
  const [eliminando, setEliminando] = useState(false);
  const eliminandoRef = useRef(false);
  const [errorEliminar, setErrorEliminar] = useState('');
  const avisoRef = useRef(null);
  const [expandidoId, setExpandidoId] = useState(null); // solo para "Sellos anteriores"
  const [sellosAbiertos, setSellosAbiertos] = useState(false);
  const [finalizadasAbiertas, setFinalizadasAbiertas] = useState(false);
  const ahora = useAhora(); // cada minuto se vuelve a evaluar qué terminó: pasa sola a "Finalizadas"

  // Al terminar algo (crear, eliminar) el foco pasa al aviso, que además lo anuncia: la pantalla desde la que se actuó ya no existe.
  useEffect(() => {
    if (aviso) avisoRef.current?.focus({ preventScroll: true });
  }, [aviso]);

  // Al abrir la pestaña: traer de nuevo, por si el admin aprobó o rechazó algo.
  useEffect(() => {
    onRecargar?.();
  }, [onRecargar]);

  const qrPorId = new Map(actividadesQR.map((qr) => [qr.id, qr]));
  const idsConActividad = new Set(actividades.map((a) => a.qr_sello_id).filter(Boolean));
  const sellosAnteriores = actividadesQR.filter((qr) => !idsConActividad.has(qr.id));
  // Sin fechas (actividades antiguas) no se puede saber cuándo terminan: quedan en la lista principal.
  const terminada = (a) => Boolean(a.fecha_inicio) && eventoTermino(a, ahora);
  const activas = actividades.filter((a) => !terminada(a));
  const finalizadas = actividades.filter(terminada);
  const actividadAbierta = detalleId == null ? null : actividades.find((a) => a.id === detalleId) || null;
  const actividadEnEdicion = editandoId == null ? null : actividades.find((a) => a.id === editandoId) || null;

  const cerrarConfirmacion = () => {
    setPorEliminar(null);
    setErrorEliminar('');
  };

  const handleEliminarActividad = async () => {
    if (!porEliminar || eliminandoRef.current) return;
    eliminandoRef.current = true; // un segundo toque antes de que React pinte no vuelve a llamar
    setEliminando(true);
    setErrorEliminar('');
    let resultado;
    try {
      resultado = await onBorrarActividad(porEliminar.id);
    } catch (error) {
      console.error('Error eliminando la actividad:', error);
      resultado = { exito: false, mensaje: 'No se pudo eliminar la actividad. Revisa tu conexión e intenta de nuevo.' };
    }
    eliminandoRef.current = false;
    setEliminando(false);

    if (!resultado.exito) {
      setErrorEliminar(resultado.mensaje); // la ventana sigue abierta y dice por qué no se pudo
      return;
    }
    cerrarConfirmacion();
    setDetalleId(null);
    setAviso('Actividad eliminada.');
  };

  const handleEliminarQR = async (id) => {
    const resultado = await onEliminarActividad(id);
    if (!resultado.exito) {
      window.alert(resultado.mensaje);
      return;
    }
    if (expandidoId === `qr-${id}`) setExpandidoId(null);
  };

  const renderFilaActividad = (actividad, finalizada) => {
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
        estado={estadoDeActividad(actividad, finalizada)}
        onAbrir={() => { setAviso(''); setAvisoDetalle(''); setDetalleId(actividad.id); }}
      />
    );
  };

  const vistaActividades = (
    <>
      {aviso && <p className="generarqr-aviso" role="status" tabIndex={-1} ref={avisoRef}>{aviso}</p>}

      {activas.length > 0 ? (
        <ul className="fila-compacta-lista">{activas.map((actividad) => renderFilaActividad(actividad, false))}</ul>
      ) : (
        <p className="generarqr-vacio">
          {actividades.length === 0
            ? 'Aún no tienes actividades. Publica la primera con el botón de abajo.'
            : 'No tienes actividades activas ni próximas. Publica una con el botón de abajo.'}
        </p>
      )}

      <button type="button" className="generarqr-nuevo" onClick={() => { setAviso(''); setCreando(true); }}>
        <Plus size={18} strokeWidth={2.4} aria-hidden="true" /> Nueva actividad
      </button>

      {finalizadas.length > 0 && (
        <div className="generarqr-anteriores">
          <button
            type="button"
            className="generarqr-anteriores-toggle"
            aria-expanded={finalizadasAbiertas}
            aria-controls={finalizadasAbiertas ? 'actividades-finalizadas' : undefined}
            onClick={() => setFinalizadasAbiertas((v) => !v)}
          >
            Finalizadas ({finalizadas.length})
            <ChevronDown size={16} strokeWidth={2.2} aria-hidden="true" className={finalizadasAbiertas ? 'girada' : ''} />
          </button>
          {finalizadasAbiertas && (
            <ul className="fila-compacta-lista" id="actividades-finalizadas">{finalizadas.map((actividad) => renderFilaActividad(actividad, true))}</ul>
          )}
        </div>
      )}

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
                    onAlternar={() => setExpandidoId(expandidoId === clave ? null : clave)}
                  >
                    <BloqueQR valor={`WHEREGUENSE-QR:${qr.token}`} color={qr.color} nombreArchivo={`sello-qr-${qr.nombre_actividad}`} />
                    <div className="generarqr-item-acciones">
                      <button
                        type="button"
                        className="generarqr-item-eliminar"
                        onClick={() => handleEliminarQR(qr.id)}
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
        ? <CuponesNegocio negocioId={negocioId} nombreNegocio={organizador?.nombre || ''} />
        : <p className="generarqr-vacio">No encontramos tu negocio. Vuelve a abrir tu panel.</p>)}

      {actividadAbierta && (
        <DetalleActividad
          actividad={actividadAbierta}
          organizador={organizador}
          qr={actividadAbierta.qr_sello_id ? qrPorId.get(actividadAbierta.qr_sello_id) || null : null}
          entregados={sellosEntregados == null ? null : (sellosEntregados[actividadAbierta.id] || 0)}
          aviso={avisoDetalle}
          onVolver={() => setDetalleId(null)}
          onEditar={onEditarActividad ? () => { setAvisoDetalle(''); setEditandoId(actividadAbierta.id); } : undefined}
          onEliminar={onBorrarActividad ? () => { setErrorEliminar(''); setPorEliminar({ id: actividadAbierta.id, conSello: actividadAbierta.estado_sello === 'aprobado' }); } : undefined}
          onReenviarSello={onReenviarSello}
        />
      )}

      {porEliminar && (
        <DialogoConfirmacion
          titulo="¿Eliminar esta actividad?"
          texto={`Se quitará de Eventos y de la ficha del negocio. También se borrarán los favoritos de quienes la guardaron.${porEliminar.conSello ? ' Su sello y su QR también se eliminan.' : ''} No se puede deshacer.`}
          etiquetaConfirmar="Eliminar"
          etiquetaCargando="Eliminando…"
          tono="peligro"
          cargando={eliminando}
          error={errorEliminar}
          onConfirmar={handleEliminarActividad}
          onCancelar={cerrarConfirmacion}
        />
      )}

      {actividadEnEdicion && (
        <FormularioActividad
          actividad={actividadEnEdicion}
          organizador={organizador}
          onGuardar={onEditarActividad}
          onSalir={() => setEditandoId(null)}
          onCerrar={(resultado) => { setEditandoId(null); setAvisoDetalle(resultado?.aviso || 'Cambios guardados.'); }}
        />
      )}

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
