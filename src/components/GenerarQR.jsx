import { useRef, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import './GenerarQR.css';
import TopBar from './TopBar';

const COLORES = [
  '#1119BC', '#4945CD', '#161D30',
  '#180E57', '#193E6A', '#45A6D9',
  '#54C8C0', '#78E33C', '#F24E50',
];

function generarToken() {
  return Math.random().toString(36).slice(2, 10).toUpperCase();
}

function GenerarQR({ negocio, onGenerarQR, onNavigate }) {
  const areaRef = useRef(null);
  const [color, setColor] = useState(negocio?.qr?.color || COLORES[0]);

  const valorQR = negocio?.qr
    ? `WHEREGUENSE-SELLO:${negocio.nombre}:${negocio.qr.token}`
    : null;

  const handleGenerar = () => {
    onGenerarQR({ token: generarToken(), color, fecha: new Date().toISOString() });
  };

  const handleDescargar = () => {
    const canvas = areaRef.current?.querySelector('canvas');
    if (!canvas) return;
    const url = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = url;
    link.download = `sello-qr-${negocio?.nombre || 'negocio'}.png`;
    link.click();
  };

  const handleImprimir = () => {
    window.print();
  };

  return (
    <div className="generarqr-wrapper">
      <TopBar onBack={() => onNavigate('perfilNegocio')} />

      <div className="generarqr-contenido">
        <h1 className="generarqr-titulo">Generar sello QR</h1>

        <div className="generarqr-qr-area" ref={areaRef}>
          {valorQR ? (
            <QRCodeCanvas value={valorQR} size={220} fgColor={color} level="M" includeMargin />
          ) : (
            <p className="generarqr-vacio">Toca &quot;Generar QR&quot; para crear el sello.</p>
          )}
        </div>

        <button className="generarqr-generar-btn" onClick={handleGenerar} type="button">
          {negocio?.qr ? '🔁 Regenerar QR' : '🔳 Generar QR'}
        </button>

        {valorQR && (
          <div className="generarqr-acciones">
            <button className="generarqr-accion" onClick={handleDescargar} type="button">
              ⬇️ Descargar
            </button>
            <button className="generarqr-accion" onClick={handleImprimir} type="button">
              🖨️ Imprimir
            </button>
          </div>
        )}

        <p className="generarqr-label">Color del sello</p>
        <div className="generarqr-colores">
          {COLORES.map((c) => (
            <button
              key={c}
              type="button"
              className={`generarqr-color ${color === c ? 'generarqr-color-activo' : ''}`}
              style={{ background: c }}
              onClick={() => setColor(c)}
              aria-label={`Color ${c}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default GenerarQR;
