import { useState } from 'react';
import './EstadoNegocio.css';

function EstadoNegocio({ vista, motivoRechazo, onContinuar, onSimularAprobar, onSimularRechazar, onCorregir }) {
  const [mostrarPruebas, setMostrarPruebas] = useState(false);
  const [motivoInput, setMotivoInput] = useState('');

  if (vista === 'enviado') {
    return (
      <div className="estado-wrapper">
        <div className="estado-icono estado-icono-enviado">✉️</div>
        <h1 className="estado-titulo">Registro enviado</h1>
        <p className="estado-mensaje">Pendiente la respuesta del administrador.</p>
        <button className="estado-boton" onClick={onContinuar} type="button">
          Continuar
        </button>
      </div>
    );
  }

  if (vista === 'rechazado') {
    return (
      <div className="estado-wrapper">
        <div className="estado-icono estado-icono-rechazado">✕</div>
        <h1 className="estado-titulo">Rechazado</h1>
        <p className="estado-mensaje">Verifica los datos o registra otro negocio.</p>
        {motivoRechazo && <p className="estado-motivo">Motivo: {motivoRechazo}</p>}
        <button className="estado-boton" onClick={onCorregir} type="button">
          Corregir datos
        </button>
      </div>
    );
  }

  return (
    <div className="estado-wrapper">
      <div className="estado-icono estado-icono-pendiente">🕐</div>
      <h1 className="estado-titulo">Esperando respuesta</h1>
      <p className="estado-mensaje">Un administrador revisará tu solicitud (hasta 5 días).</p>

      <button
        className="estado-dev-toggle"
        onClick={() => setMostrarPruebas(!mostrarPruebas)}
        type="button"
      >
        🛠 Modo prueba: simular respuesta del admin
      </button>

      {mostrarPruebas && (
        <div className="estado-dev-panel">
          <button className="estado-dev-aprobar" onClick={onSimularAprobar} type="button">
            ✅ Simular aprobación
          </button>

          <textarea
            className="estado-dev-motivo"
            placeholder="Motivo de rechazo (obligatorio)"
            value={motivoInput}
            onChange={(e) => setMotivoInput(e.target.value)}
          />
          <button
            className="estado-dev-rechazar"
            disabled={!motivoInput.trim()}
            onClick={() => onSimularRechazar(motivoInput.trim())}
            type="button"
          >
            ❌ Simular rechazo
          </button>
        </div>
      )}
    </div>
  );
}

export default EstadoNegocio;
