import { Mail, X, Clock } from 'lucide-react';
import './EstadoNegocio.css';

function EstadoNegocio({ vista, motivoRechazo, onContinuar, onCorregir }) {
  if (vista === 'enviado') {
    return (
      <div className="estado-wrapper">
        <div className="estado-icono estado-icono-enviado"><Mail size={56} strokeWidth={1.8} aria-hidden="true" /></div>
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
        <div className="estado-icono estado-icono-rechazado"><X size={56} strokeWidth={1.8} aria-hidden="true" /></div>
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
      <div className="estado-icono estado-icono-pendiente"><Clock size={56} strokeWidth={1.8} aria-hidden="true" /></div>
      <h1 className="estado-titulo">Esperando respuesta</h1>
      <p className="estado-mensaje">Un administrador revisará tu solicitud (hasta 5 días).</p>
    </div>
  );
}

export default EstadoNegocio;
