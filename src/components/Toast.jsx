import { useEffect } from 'react';
import './Toast.css';

function Toast({ sitio, onClose, onClick }) {
  useEffect(() => {
    if (!sitio) return undefined;
    const temporizador = setTimeout(onClose, 5000);
    return () => clearTimeout(temporizador);
  }, [sitio, onClose]);

  if (!sitio) return null;

  return (
    <div className="toast-wrapper" onClick={onClick} role="button" tabIndex={0}>
      <span className="toast-icono">🏅</span>
      <div className="toast-texto">
        <strong>¡Sello obtenido!</strong>
        <span>{sitio.name} — toca para ver</span>
      </div>
    </div>
  );
}

export default Toast;
