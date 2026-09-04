import { useRef, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import './GenerarQR.css';
import TopBar from './TopBar';

const COLORES = [
  '#1119BC', '#4945CD', '#161D30',
  '#180E57', '#193E6A', '#45A6D9',
  '#54C8C0', '#78E33C', '#F24E50',
];

function GenerarQR({ actividadesQR, onCrearActividad, onEliminarActividad, onNavigate }) {
  const areaRef = useRef(null);
  const [nombre, setNombre] = useState('');
  const [limite, setLimite] = useState('');
  const [fechaExpiracion, setFechaExpiracion] = useState('');
  const [color, setColor] = useState(COLORES[0]);
  const [guardando, setGuardando] = useState(false);
  const [expandidoId, setExpandidoId] = useState(null);

  const handleCrear = async () => {
    const valor = nombre.trim();
    if (!valor) return;

    if (limite && Number(limite) <= 0) {
      window.alert('El límite de canjes debe ser mayor a 0, o déjalo vacío para "sin límite".');
      return;
    }

    setGuardando(true);
    const resultado = await onCrearActividad({
      nombre: valor,
      color,
      limiteCanjes: limite ? Number(limite) : null,
      fechaExpiracion: fechaExpiracion || null,
    });
    setGuardando(false);

    if (!resultado.exito) {
      window.alert(resultado.mensaje);
      return;
    }

    setNombre('');
    setLimite('');
    setFechaExpiracion('');
    setColor(COLORES[0]);
  };

  const handleEliminar = async (id) => {
    const resultado = await onEliminarActividad(id);
    if (!resultado.exito) {
      window.alert(resultado.mensaje);
      return;
    }
    if (expandidoId === id) setExpandidoId(null);
  };

  const handleDescargar = (actividad) => {
    const canvas = areaRef.current?.querySelector('canvas');
    if (!canvas) return;
    const url = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = url;
    link.download = `sello-qr-${actividad.nombre_actividad}.png`;
    link.click();
  };

  const handleImprimir = () => {
    window.print();
  };

  return (
    <div className="generarqr-wrapper">
      <TopBar title="Actividades de sello" onBack={() => onNavigate('perfilNegocio')} />

      <div className="generarqr-contenido">
        <h1 className="generarqr-titulo">Actividades de sello</h1>

        {actividadesQR.length > 0 ? (
          <div className="generarqr-lista">
            {actividadesQR.map((actividad) => {
              const valorQR = `WHEREGUENSE-QR:${actividad.token}`;
              const expandido = expandidoId === actividad.id;
              return (
                <div key={actividad.id} className="generarqr-item">
                  <div className="generarqr-item-info">
                    <strong>{actividad.nombre_actividad}</strong>
                    <span>
                      {actividad.limite_canjes ? `Límite: ${actividad.limite_canjes} canjes` : 'Sin límite de canjes'}
                    </span>
                    {actividad.fecha_expiracion && (
                      <span>Vence: {new Date(actividad.fecha_expiracion).toLocaleDateString('es-NI')}</span>
                    )}
                  </div>
                  <div className="generarqr-item-acciones">
                    <button
                      type="button"
                      className="generarqr-accion"
                      onClick={() => setExpandidoId(expandido ? null : actividad.id)}
                    >
                      {expandido ? 'Ocultar QR' : 'Ver QR'}
                    </button>
                    <button
                      type="button"
                      className="generarqr-item-eliminar"
                      onClick={() => handleEliminar(actividad.id)}
                      aria-label={`Eliminar ${actividad.nombre_actividad}`}
                    >
                      🗑️
                    </button>
                  </div>

                  {expandido && (
                    <div className="generarqr-qr-area" ref={areaRef}>
                      <QRCodeCanvas value={valorQR} size={200} fgColor={actividad.color} level="M" includeMargin />
                    </div>
                  )}
                  {expandido && (
                    <div className="generarqr-acciones">
                      <button className="generarqr-accion" onClick={() => handleDescargar(actividad)} type="button">
                        ⬇️ Descargar
                      </button>
                      <button className="generarqr-accion" onClick={handleImprimir} type="button">
                        🖨️ Imprimir
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="generarqr-vacio">Aún no tienes actividades de sello. Crea la primera abajo.</p>
        )}

        <h2 className="generarqr-subtitulo">Nueva actividad</h2>

        <input
          type="text"
          className="generarqr-input"
          placeholder="Ej. Degustación de café"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
        />
        <input
          type="number"
          min="1"
          className="generarqr-input"
          placeholder="Límite de canjes (opcional)"
          value={limite}
          onChange={(e) => setLimite(e.target.value)}
        />
        <input
          type="date"
          className="generarqr-input"
          min={new Date().toISOString().slice(0, 10)}
          value={fechaExpiracion}
          onChange={(e) => setFechaExpiracion(e.target.value)}
        />

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

        <button className="generarqr-generar-btn" onClick={handleCrear} disabled={guardando} type="button">
          {guardando ? 'Creando...' : '🔳 Crear actividad'}
        </button>
      </div>
    </div>
  );
}

export default GenerarQR;
