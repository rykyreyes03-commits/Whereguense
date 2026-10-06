import { useState } from 'react';
import { Check, X, Trash2 } from 'lucide-react';
import './PanelAdmin.css';
import TopBar from './TopBar';
import DialogoConfirmacion from './DialogoConfirmacion';
import { EstrellasValor } from './Estrellas';
import { fechaCorta } from '../utils/resenas';
import { useAdmin } from '../hooks/useAdmin';
import { useAhora } from '../hooks/useAhora';
import { eventoTermino } from '../utils/eventos';
import './ListaResenas.css';

function formatearFecha(fechaISO) {
  return new Date(`${fechaISO}T00:00:00`).toLocaleDateString('es-NI', { day: 'numeric', month: 'short', year: 'numeric' });
}

// usuarioId: el admin que mira el panel. No puede aprobar el sello de su propio negocio
// (admin_aprobar_sello lo rechaza, 025); aquí se ve la tarjeta pero sin el botón activo.
function PanelAdmin({ onVolver, usuarioId }) {
  const {
    pendientes,
    cargando,
    aprobar,
    rechazar,
    solicitudesSello,
    cargandoSellos,
    aprobarSello,
    rechazarSello,
    resenas,
    cargandoResenas,
    borrarResena,
  } = useAdmin();
  const ahora = useAhora();
  const [filtroNegocio, setFiltroNegocio] = useState('todos');
  const [porEliminar, setPorEliminar] = useState(null);
  const [eliminando, setEliminando] = useState(false);
  const [errorEliminar, setErrorEliminar] = useState('');
  // Claves 'negocio-<id>' y 'sello-<id>': los ids de negocio y actividad pueden coincidir.
  const [motivoPorId, setMotivoPorId] = useState({});
  const [procesando, setProcesando] = useState(null);

  const ejecutar = async (clave, accion) => {
    setProcesando(clave);
    const resultado = await accion();
    setProcesando(null);
    if (!resultado.exito) window.alert(resultado.mensaje);
  };

  const conMotivo = (clave, accion) => {
    const motivo = (motivoPorId[clave] || '').trim();
    if (!motivo) {
      window.alert('Escribe un motivo de rechazo.');
      return;
    }
    ejecutar(clave, () => accion(motivo));
  };

  const negociosConResenas = [...new Map(resenas.map((r) => [r.negocioId, { id: r.negocioId, nombre: r.negocio }])).values()]
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  // Si el negocio filtrado se quedó sin reseñas (se eliminó la última), vuelve a "todos".
  const filtroVigente = negociosConResenas.some((n) => String(n.id) === filtroNegocio) ? filtroNegocio : 'todos';
  const resenasVisibles = filtroVigente === 'todos' ? resenas : resenas.filter((r) => String(r.negocioId) === filtroVigente);

  return (
    <div className="panelAdmin-wrapper">
      <TopBar title="Panel Admin" onBack={onVolver} />
      <div className="panelAdmin-contenido">
        <h2 className="panelAdmin-seccion">Negocios pendientes</h2>

        {cargando && <p className="panelAdmin-estado">Cargando solicitudes…</p>}

        {!cargando && pendientes.length === 0 && (
          <p className="panelAdmin-estado">No hay negocios pendientes de aprobación.</p>
        )}

        {pendientes.map((n) => {
          const clave = `negocio-${n.id}`;
          return (
            <div key={clave} className="panelAdmin-card">
              <h2>{n.nombre}</h2>
              <p className="panelAdmin-detalle">{n.categoria} · {n.responsable || 'Sin responsable'}</p>
              <p className="panelAdmin-detalle">📞 {n.telefono || 'Sin teléfono'}</p>
              <p className="panelAdmin-fecha">
                Enviado: {new Date(n.fechaEnvio).toLocaleDateString('es-NI')}
              </p>

              <button
                className="panelAdmin-btn panelAdmin-btn-aprobar"
                onClick={() => ejecutar(clave, () => aprobar(n.id))}
                disabled={procesando === clave}
                type="button"
              >
                <Check size={16} strokeWidth={2.6} aria-hidden="true" /> Aprobar
              </button>

              <textarea
                className="panelAdmin-motivo"
                placeholder="Motivo de rechazo"
                value={motivoPorId[clave] || ''}
                onChange={(e) => setMotivoPorId({ ...motivoPorId, [clave]: e.target.value })}
              />
              <button
                className="panelAdmin-btn panelAdmin-btn-rechazar"
                onClick={() => conMotivo(clave, (motivo) => rechazar(n.id, motivo))}
                disabled={procesando === clave}
                type="button"
              >
                <X size={16} strokeWidth={2.6} aria-hidden="true" /> Rechazar
              </button>
            </div>
          );
        })}

        <h2 className="panelAdmin-seccion">Solicitudes de sello pendientes</h2>

        {cargandoSellos && <p className="panelAdmin-estado">Cargando solicitudes…</p>}

        {!cargandoSellos && solicitudesSello.length === 0 && (
          <p className="panelAdmin-estado">No hay solicitudes de sello pendientes.</p>
        )}

        {solicitudesSello.map((s) => {
          const clave = `sello-${s.id}`;
          const esPropio = Boolean(usuarioId) && s.duenioId === usuarioId;
          // Misma regla que la base (033): una actividad que ya terminó no recibe QR; solo se puede rechazar.
          const terminada = eventoTermino({ fechaFin: s.fechaFin, horaInicio: s.horaInicio, horaFin: s.horaFin }, ahora);
          return (
            <div key={clave} className="panelAdmin-card">
              {s.fotoUrl && (
                <img className="panelAdmin-foto" src={s.fotoUrl} alt={`Foto de ${s.nombre}`} loading="lazy" />
              )}
              <h2>{s.nombre}</h2>
              {terminada && <p className="panelAdmin-terminada">Ya terminó</p>}
              <p className="panelAdmin-detalle">{s.negocio}</p>
              <p className="panelAdmin-detalle">
                {s.fechaInicio
                  ? `${formatearFecha(s.fechaInicio)} – ${formatearFecha(s.fechaFin)}`
                  : 'Sin fechas (sello permanente)'}
              </p>
              {s.descripcion && (
                <>
                  <p className="panelAdmin-etiqueta">Descripción</p>
                  <p className="panelAdmin-justificacion">{s.descripcion}</p>
                </>
              )}
              <p className="panelAdmin-etiqueta">Límite de canjes solicitado</p>
              <p className="panelAdmin-justificacion">
                {s.limiteCanjes ? `${s.limiteCanjes} canjes` : 'Sin límite'}
              </p>
              <p className="panelAdmin-etiqueta">Para qué lo va a usar</p>
              <p className="panelAdmin-justificacion">{s.justificacion}</p>
              <p className="panelAdmin-fecha">
                Enviado: {new Date(s.fechaCreacion).toLocaleDateString('es-NI')}
              </p>

              <button
                className="panelAdmin-btn panelAdmin-btn-aprobar"
                onClick={() => ejecutar(clave, () => aprobarSello(s.id))}
                disabled={procesando === clave || esPropio || terminada}
                type="button"
              >
                <Check size={16} strokeWidth={2.6} aria-hidden="true" /> Aprobar
              </button>
              {esPropio && (
                <p className="panelAdmin-aviso">No puedes aprobar el sello de tu propio negocio.</p>
              )}
              {terminada && (
                <p className="panelAdmin-aviso">Esta actividad ya terminó: su sello nacería vencido. Puedes rechazar la solicitud.</p>
              )}

              <textarea
                className="panelAdmin-motivo"
                placeholder="Motivo de rechazo"
                value={motivoPorId[clave] || ''}
                onChange={(e) => setMotivoPorId({ ...motivoPorId, [clave]: e.target.value })}
              />
              <button
                className="panelAdmin-btn panelAdmin-btn-rechazar"
                onClick={() => conMotivo(clave, (motivo) => rechazarSello(s.id, motivo))}
                disabled={procesando === clave}
                type="button"
              >
                <X size={16} strokeWidth={2.6} aria-hidden="true" /> Rechazar
              </button>
            </div>
          );
        })}

        <h2 className="panelAdmin-seccion">Reseñas</h2>

        {cargandoResenas && <p className="panelAdmin-estado">Cargando reseñas…</p>}

        {!cargandoResenas && resenas.length === 0 && (
          <p className="panelAdmin-estado">Aún no hay reseñas.</p>
        )}

        {resenas.length > 0 && (
          <label className="panelAdmin-filtro">
            <span>Negocio</span>
            <select value={filtroVigente} onChange={(e) => setFiltroNegocio(e.target.value)}>
              <option value="todos">Todos los negocios</option>
              {negociosConResenas.map((n) => (
                <option key={n.id} value={String(n.id)}>{n.nombre}</option>
              ))}
            </select>
          </label>
        )}

        {resenasVisibles.map((r) => (
          <div key={`resena-${r.id}`} className="panelAdmin-card">
            <h2>{r.negocio}</h2>
            <p className="panelAdmin-detalle">
              <EstrellasValor valor={r.calificacion} /> · {r.autor} · {fechaCorta(r.fecha)}
            </p>
            <p className="panelAdmin-justificacion">{r.comentario}</p>
            {r.respuesta && (
              <>
                <p className="panelAdmin-etiqueta">Respuesta del negocio</p>
                <p className="panelAdmin-justificacion">{r.respuesta}</p>
              </>
            )}
            <button
              className="panelAdmin-btn panelAdmin-btn-rechazar"
              onClick={() => { setErrorEliminar(''); setPorEliminar(r); }}
              type="button"
            >
              <Trash2 size={16} strokeWidth={2.4} aria-hidden="true" /> Eliminar
            </button>
          </div>
        ))}
      </div>
      {porEliminar && (
        <DialogoConfirmacion
          titulo="¿Eliminar esta reseña?"
          texto={`Se borra la reseña de ${porEliminar.autor} en ${porEliminar.negocio}, con la respuesta del negocio si la tiene. No se puede deshacer.`}
          etiquetaConfirmar="Eliminar reseña"
          etiquetaCancelar="Conservarla"
          etiquetaCargando="Eliminando…"
          tono="peligro"
          cargando={eliminando}
          error={errorEliminar}
          onCancelar={() => setPorEliminar(null)}
          onConfirmar={async () => {
            setEliminando(true);
            setErrorEliminar('');
            const r = await borrarResena(porEliminar.id);
            setEliminando(false);
            if (r.exito) setPorEliminar(null);
            else setErrorEliminar(r.mensaje);
          }}
        />
      )}
    </div>
  );
}

export default PanelAdmin;
