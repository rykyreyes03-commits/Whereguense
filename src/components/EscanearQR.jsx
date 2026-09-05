import { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import './EscanearQR.css';
import TopBar from './TopBar';

const PREFIJO_QR = 'WHEREGUENSE-QR:';

function EscanearQR({ onVolver, onCanjearQR, onNavigate }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const frameRef = useRef(null);
  const procesandoRef = useRef(false);

  const [estadoCamara, setEstadoCamara] = useState('iniciando');
  const [resultado, setResultado] = useState(null);

  useEffect(() => {
    let activo = true;

    async function manejarToken(token) {
      const res = await onCanjearQR(token);
      if (!activo) return;
      setResultado(res);
    }

    function escanearFrame() {
      if (!activo) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!procesandoRef.current && video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imagen = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const codigo = jsQR(imagen.data, imagen.width, imagen.height);
        if (codigo && codigo.data.startsWith(PREFIJO_QR)) {
          procesandoRef.current = true;
          manejarToken(codigo.data.slice(PREFIJO_QR.length));
        }
      }
      frameRef.current = requestAnimationFrame(escanearFrame);
    }

    async function iniciarCamara() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        });
        if (!activo) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setEstadoCamara('activa');
        frameRef.current = requestAnimationFrame(escanearFrame);
      } catch (error) {
        console.error('Error accediendo a la cámara:', error);
        if (activo) setEstadoCamara('error');
      }
    }

    iniciarCamara();

    return () => {
      activo = false;
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [onCanjearQR]);

  const handleReintentar = () => {
    setResultado(null);
    procesandoRef.current = false;
  };

  const irAMisSellos = () => onNavigate?.('pasaporte');

  return (
    <div className="escanear-wrapper">
      <TopBar title="Escanear sello" onBack={() => onVolver?.()} />
      <div className="escanear-contenido">
        <p className="escanear-instruccion">
          Apunta la cámara al código QR del negocio.
        </p>
        <div className="escanear-visor">
          <video ref={videoRef} className="escanear-video" muted playsInline />
          <canvas ref={canvasRef} style={{ display: 'none' }} />
          <span className="escanear-esquina escanear-esquina--tl" />
          <span className="escanear-esquina escanear-esquina--tr" />
          <span className="escanear-esquina escanear-esquina--bl" />
          <span className="escanear-esquina escanear-esquina--br" />
          {estadoCamara === 'activa' && !resultado && <span className="escanear-linea" />}
          {estadoCamara !== 'activa' && (
            <svg viewBox="0 0 24 24" width="56" height="56" fill="none" className="escanear-visor-glifo">
              <path d="M5 9V6a1 1 0 0 1 1-1h3M15 5h3a1 1 0 0 1 1 1v3M19 15v3a1 1 0 0 1-1 1h-3M9 19H6a1 1 0 0 1-1-1v-3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              <rect x="9" y="9" width="6" height="6" rx="1" fill="currentColor" />
            </svg>
          )}
        </div>

        {estadoCamara === 'iniciando' && (
          <p className="escanear-nota">Activando cámara…</p>
        )}
        {estadoCamara === 'error' && (
          <p className="escanear-aviso">
            No pudimos acceder a tu cámara. Revisa los permisos del navegador e intenta de nuevo.
          </p>
        )}

        {resultado && (
          <div className={`escanear-resultado ${resultado.exito ? 'escanear-resultado--exito' : 'escanear-resultado--error'}`}>
            <p>{resultado.mensaje}</p>
            {resultado.exito ? (
              <button className="escanear-btn" onClick={irAMisSellos} type="button">
                Ver mis sellos
              </button>
            ) : (
              <button className="escanear-btn" onClick={handleReintentar} type="button">
                Intentar de nuevo
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default EscanearQR;
