import { useState } from 'react';
import './PanelAdmin.css';
import TopBar from './TopBar';
import { useAdmin } from '../hooks/useAdmin';

function PanelAdmin({ onVolver }) {
  const { pendientes, cargando, aprobar, rechazar } = useAdmin();
  const [motivoPorId, setMotivoPorId] = useState({});
  const [procesando, setProcesando] = useState(null);

  const handleAprobar = async (id) => {
    setProcesando(id);
    const resultado = await aprobar(id);
    setProcesando(null);
    if (!resultado.exito) window.alert(resultado.mensaje);
  };

  const handleRechazar = async (id) => {
    const motivo = (motivoPorId[id] || '').trim();
    if (!motivo) {
      window.alert('Escribe un motivo de rechazo.');
      return;
    }
    setProcesando(id);
    const resultado = await rechazar(id, motivo);
    setProcesando(null);
    if (!resultado.exito) window.alert(resultado.mensaje);
  };

  return (
    <div className="panelAdmin-wrapper">
      <TopBar title="Panel Admin" onBack={onVolver} />
      <div className="panelAdmin-contenido">
        {cargando && <p className="panelAdmin-estado">Cargando solicitudes…</p>}

        {!cargando && pendientes.length === 0 && (
          <p className="panelAdmin-estado">No hay negocios pendientes de aprobación.</p>
        )}

        {pendientes.map((n) => (
          <div key={n.id} className="panelAdmin-card">
            <h2>{n.nombre}</h2>
            <p className="panelAdmin-detalle">{n.categoria} · {n.responsable || 'Sin responsable'}</p>
            <p className="panelAdmin-detalle">📞 {n.telefono || 'Sin teléfono'}</p>
            <p className="panelAdmin-fecha">
              Enviado: {new Date(n.fechaEnvio).toLocaleDateString('es-NI')}
            </p>

            <button
              className="panelAdmin-btn panelAdmin-btn-aprobar"
              onClick={() => handleAprobar(n.id)}
              disabled={procesando === n.id}
              type="button"
            >
              ✅ Aprobar
            </button>

            <textarea
              className="panelAdmin-motivo"
              placeholder="Motivo de rechazo"
              value={motivoPorId[n.id] || ''}
              onChange={(e) => setMotivoPorId({ ...motivoPorId, [n.id]: e.target.value })}
            />
            <button
              className="panelAdmin-btn panelAdmin-btn-rechazar"
              onClick={() => handleRechazar(n.id)}
              disabled={procesando === n.id}
              type="button"
            >
              ❌ Rechazar
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default PanelAdmin;
