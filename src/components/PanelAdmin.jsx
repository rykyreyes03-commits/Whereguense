import { useState } from 'react';
import { Check, X } from 'lucide-react';
import './PanelAdmin.css';
import TopBar from './TopBar';
import { useAdmin } from '../hooks/useAdmin';

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
  } = useAdmin();
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
          return (
            <div key={clave} className="panelAdmin-card">
              <h2>{s.nombre}</h2>
              <p className="panelAdmin-detalle">{s.negocio}</p>
              <p className="panelAdmin-detalle">
                {s.fechaInicio
                  ? `${formatearFecha(s.fechaInicio)} – ${formatearFecha(s.fechaFin)}`
                  : 'Sin fechas (sello permanente)'}
              </p>
              <p className="panelAdmin-etiqueta">Para qué lo va a usar</p>
              <p className="panelAdmin-justificacion">{s.justificacion}</p>
              <p className="panelAdmin-fecha">
                Enviado: {new Date(s.fechaCreacion).toLocaleDateString('es-NI')}
              </p>

              <button
                className="panelAdmin-btn panelAdmin-btn-aprobar"
                onClick={() => ejecutar(clave, () => aprobarSello(s.id))}
                disabled={procesando === clave || esPropio}
                type="button"
              >
                <Check size={16} strokeWidth={2.6} aria-hidden="true" /> Aprobar
              </button>
              {esPropio && (
                <p className="panelAdmin-aviso">No puedes aprobar el sello de tu propio negocio.</p>
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
      </div>
    </div>
  );
}

export default PanelAdmin;
