import { Mail, X, Clock, CalendarX, MessageCircle } from 'lucide-react';
import './EstadoNegocio.css';

const WHATSAPP_RENOVACION = '50587074097';

function EstadoNegocio({ vista, motivoRechazo, nombreNegocio, onContinuar, onCorregir }) {
  if (vista === 'vencido') {
    const mensaje = `Hola, quiero renovar la suscripción de mi negocio ${nombreNegocio || ''} en Wheregüense`
      .replace(/\s+/g, ' ');
    const urlWhatsApp = `https://wa.me/${WHATSAPP_RENOVACION}?text=${encodeURIComponent(mensaje)}`;
    return (
      <div className="estado-wrapper">
        <div className="estado-icono estado-icono-vencido"><CalendarX size={56} strokeWidth={1.8} aria-hidden="true" /></div>
        <h1 className="estado-titulo">Tu período de prueba gratis terminó</h1>
        <p className="estado-mensaje">
          Para seguir apareciendo en el mapa y usando tus herramientas de negocio, escríbenos por WhatsApp para renovar tu suscripción.
        </p>
        <a className="estado-boton estado-boton-enlace" href={urlWhatsApp} target="_blank" rel="noopener noreferrer">
          <MessageCircle size={20} strokeWidth={2} aria-hidden="true" /> Renovar por WhatsApp
        </a>
      </div>
    );
  }

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
