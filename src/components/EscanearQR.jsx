import { useState } from 'react';
import './EscanearQR.css';
import TopBar from './TopBar';
import Toast from './Toast';

function EscanearQR({ onVolver, onEscaneoExitoso, onNavigate }) {
  const [codigo, setCodigo] = useState('');
  const [resultado, setResultado] = useState(null);
  const [sinPendientes, setSinPendientes] = useState(false);

  const irAMisSellos = () => onNavigate?.('pasaporte');

  const handleSimular = async () => {
    const sitio = await onEscaneoExitoso?.();
    if (sitio) {
      setResultado(sitio);
      setSinPendientes(false);
    } else {
      setSinPendientes(true);
    }
  };

  return (
    <div className="escanear-wrapper">
      <TopBar title="Escanear sello" onBack={() => onVolver?.()} />

      <div className="escanear-contenido">
        <p className="escanear-instruccion">
          Apunta la cámara al código QR del negocio.
        </p>

        <div className="escanear-visor" aria-hidden="true">
          <span className="escanear-esquina escanear-esquina--tl" />
          <span className="escanear-esquina escanear-esquina--tr" />
          <span className="escanear-esquina escanear-esquina--bl" />
          <span className="escanear-esquina escanear-esquina--br" />
          <span className="escanear-linea" />
          <svg viewBox="0 0 24 24" width="56" height="56" fill="none" className="escanear-visor-glifo">
            <path d="M5 9V6a1 1 0 0 1 1-1h3M15 5h3a1 1 0 0 1 1 1v3M19 15v3a1 1 0 0 1-1 1h-3M9 19H6a1 1 0 0 1-1-1v-3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            <rect x="9" y="9" width="6" height="6" rx="1" fill="currentColor" />
          </svg>
        </div>

        <p className="escanear-nota">
          La cámara real llegará pronto. Por ahora puedes probar el flujo con una
          simulación.
        </p>

        <div className="escanear-simulacion">
          <input
            type="text"
            className="escanear-input"
            placeholder="Pega un código de prueba (opcional)"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
            aria-label="Código de prueba"
          />
          <button
            type="button"
            className="escanear-btn"
            onClick={handleSimular}
          >
            Simular escaneo exitoso
          </button>
        </div>

        {sinPendientes && (
          <p className="escanear-aviso">Ya tienes todos los sellos disponibles.</p>
        )}
      </div>

      {resultado && (
        <Toast
          sitio={resultado}
          onClose={irAMisSellos}
          onClick={irAMisSellos}
        />
      )}
    </div>
  );
}

export default EscanearQR;
