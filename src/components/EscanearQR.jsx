import { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import './EscanearQR.css';
import TopBar from './TopBar';
import { clasificarQR } from '../utils/qr';

const TEXTOS = {
  sello: {
    titulo: 'Escanear sello',
    instruccion: 'Apunta la cámara al código QR del negocio.',
  },
  cupon: {
    titulo: 'Escanear cupón',
    instruccion: 'Apunta la cámara al QR de un cupón para obtenerlo, o al QR de canje del negocio para usar uno.',
  },
};

// Escáner de las dos pantallas: "Escanear sello" (modo sello) y "Escanear cupón" (modo cupón).
// Cada modo entiende los tres tipos de QR (sello, cupón, canje) y avisa con un mensaje claro
// si el código es de la otra pantalla.
//   modo sello: onCanjearQR(token) canjea el sello.
//   modo cupón: onCodigo({ tipo, token }) decide qué hacer (la pantalla EscanearCupon).
// onCodigo / onCanjearQR devuelven { exito, mensaje, detalle?, ir?: { etiqueta, pantalla } }
// para mostrar el resultado, o null para no mostrar nada (p. ej. si la pantalla cambia).
function EscanearQR({ modo = 'sello', onVolver, onCanjearQR, onCodigo, onNavigate }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const frameRef = useRef(null);
  const procesandoRef = useRef(false);
  // Siempre el manejador más reciente, sin reiniciar la cámara cuando cambia.
  const manejadorRef = useRef(null);

  const [estadoCamara, setEstadoCamara] = useState('iniciando');
  const [resultado, setResultado] = useState(null);

  useEffect(() => {
    manejadorRef.current = async (codigo) => {
      if (modo === 'cupon') return onCodigo(codigo);
      if (codigo.tipo === 'sello') return onCanjearQR(codigo.token);
      return {
        exito: false,
        mensaje: 'Este código es de un cupón, no de un sello. Para obtener o usar cupones, escanéalo en «Escanear cupón».',
        ir: { etiqueta: 'Ir a Escanear cupón', pantalla: 'escanearCupon' },
      };
    };
  });

  useEffect(() => {
    let activo = true;

    async function manejarCodigo(codigo) {
      const res = codigo.tipo === 'sello' && modo === 'cupon'
        ? {
            exito: false,
            mensaje: 'Este código es de un sello, no de un cupón. Para sellar tu pasaporte, escanéalo en «Escanear sello».',
            ir: { etiqueta: 'Ir a Escanear sello', pantalla: 'escanearQR' },
          }
        : await manejadorRef.current(codigo);
      if (!activo) return;
      if (res) {
        setResultado(res);
      } else {
        procesandoRef.current = false;
      }
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
        const leido = jsQR(imagen.data, imagen.width, imagen.height);
        // Los QR que no son de Wheregüense se ignoran, como siempre.
        const codigo = leido ? clasificarQR(leido.data) : null;
        if (codigo) {
          procesandoRef.current = true;
          manejarCodigo(codigo);
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
  }, [modo]);

  const handleReintentar = () => {
    setResultado(null);
    procesandoRef.current = false;
  };

  const textos = TEXTOS[modo] || TEXTOS.sello;
  // Éxito: lleva a donde diga el resultado (p. ej. "Ver mis cupones"); por defecto, al pasaporte.
  const destinoExito = resultado?.ir || { etiqueta: 'Ver mis sellos', pantalla: 'pasaporte' };

  return (
    <div className="escanear-wrapper">
      <TopBar title={textos.titulo} onBack={() => onVolver?.()} />
      <div className="escanear-contenido">
        <div className="escanear-modos" role="group" aria-label="Qué quieres escanear">
          <button
            type="button"
            className={`escanear-modo ${modo === 'sello' ? 'activo' : ''}`}
            aria-pressed={modo === 'sello'}
            onClick={() => modo !== 'sello' && onNavigate?.('escanearQR')}
          >
            Sello
          </button>
          <button
            type="button"
            className={`escanear-modo ${modo === 'cupon' ? 'activo' : ''}`}
            aria-pressed={modo === 'cupon'}
            onClick={() => modo !== 'cupon' && onNavigate?.('escanearCupon')}
          >
            Cupón
          </button>
        </div>
        <p className="escanear-instruccion">{textos.instruccion}</p>
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
            {resultado.detalle && <p className="escanear-detalle">{resultado.detalle}</p>}
            {resultado.exito ? (
              <button className="escanear-btn" onClick={() => onNavigate?.(destinoExito.pantalla)} type="button">
                {destinoExito.etiqueta}
              </button>
            ) : (
              <>
                {resultado.ir && (
                  <button className="escanear-btn" onClick={() => onNavigate?.(resultado.ir.pantalla)} type="button">
                    {resultado.ir.etiqueta}
                  </button>
                )}
                <button
                  className={resultado.ir ? 'escanear-btn escanear-btn--secundario' : 'escanear-btn'}
                  onClick={handleReintentar}
                  type="button"
                >
                  Intentar de nuevo
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default EscanearQR;
