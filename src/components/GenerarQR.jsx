import { useEffect, useState } from 'react';
import { Trash2, Plus, ChevronDown, Ticket } from 'lucide-react';
import './GenerarQR.css';
import TopBar from './TopBar';
import CuponesNegocio from './CuponesNegocio';
import FilaCompacta from './FilaCompacta';
import FormularioActividad from './FormularioActividad';
import DetalleActividad from './DetalleActividad';
import BloqueQR from './BloqueQR';
import { rangoEscrito, inicialDe } from '../utils/eventos';

// Etiqueta de la fila: sin sello la actividad ya está publicada; con sello depende de la revisión del admin.
function estadoDeActividad(actividad) {
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
  sellosEntregados = {}, // { [actividadId]: cuántos sellos entregó }
  onRecargar,
  onCrearActividad,
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
  const [expandidoId, setExpandidoId] = useState(null); // solo para "Sellos anteriores"
  const [sellosAbiertos, setSellosAbiertos] = useState(false);

  // Al abrir la pestaña: traer de nuevo, por si el admin aprobó o rechazó algo.
  useEffect(() => {
    onRecargar?.();
  }, [onRecargar]);

  const qrPorId = new Map(actividadesQR.map((qr) => [qr.id, qr]));
  const idsConActividad = new Set(actividades.map((a) => a.qr_sello_id).filter(Boolean));
  const sellosAnteriores = actividadesQR.filter((qr) => !idsConActividad.has(qr.id));
  const actividadAbierta = detalleId == null ? null : actividades.find((a) => a.id === detalleId) || null;

  const handleEliminarQR = async (id) => {
    const resultado = await onEliminarActividad(id);
    if (!resultado.exito) {
      window.alert(resultado.mensaje);
      return;
    }
    if (expandidoId === `qr-${id}`) setExpandidoId(null);
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
                onAbrir={() => { setAviso(''); setDetalleId(actividad.id); }}
              />
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
        ? <CuponesNegocio negocioId={negocioId} />
        : <p className="generarqr-vacio">No encontramos tu negocio. Vuelve a abrir tu panel.</p>)}

      {actividadAbierta && (
        <DetalleActividad
          actividad={actividadAbierta}
          organizador={organizador}
          qr={actividadAbierta.qr_sello_id ? qrPorId.get(actividadAbierta.qr_sello_id) || null : null}
          entregados={sellosEntregados[actividadAbierta.id] || 0}
          onVolver={() => setDetalleId(null)}
          onReenviarSello={onReenviarSello}
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
