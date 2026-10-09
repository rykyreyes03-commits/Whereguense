import { useRef } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { Download, Printer } from 'lucide-react';
import './GenerarQR.css';

function descargarCanvas(contenedor, nombreArchivo) {
  const canvas = contenedor?.querySelector('canvas');
  if (!canvas) return;
  const link = document.createElement('a');
  link.href = canvas.toDataURL('image/png');
  link.download = `${nombreArchivo}.png`;
  link.click();
}

// Un QR con sus botones de descargar e imprimir. Lo usan los sellos de actividad, los cupones y el QR de canje.
//   nombreArchivo: sin extensión; se limpia para que ningún carácter del nombre rompa la descarga.
function BloqueQR({ valor, nombreArchivo, color = '#1E2A78', soloDescargar = false }) {
  const areaRef = useRef(null);
  const archivo = String(nombreArchivo || 'qr').replace(/[^\p{L}\p{N}_-]+/gu, '-').replace(/^-+|-+$/g, '') || 'qr';
  return (
    <>
      <div className="generarqr-qr-area" ref={areaRef}>
        <QRCodeCanvas value={valor} size={200} fgColor={color} level="M" includeMargin />
      </div>
      <div className="generarqr-acciones">
        <button className="generarqr-accion" onClick={() => descargarCanvas(areaRef.current, archivo)} type="button">
          <Download size={16} strokeWidth={2} aria-hidden="true" /> Descargar
        </button>
        {!soloDescargar && (
          <button className="generarqr-accion" onClick={() => window.print()} type="button">
            <Printer size={16} strokeWidth={2} aria-hidden="true" /> Imprimir
          </button>
        )}
      </div>
    </>
  );
}

export default BloqueQR;
