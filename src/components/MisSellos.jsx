import './MisSellos.css';
import TopBar from './TopBar';
import BottomNav from './BottomNav';
import { obtenerRango } from '../utils/rango';

function MisSellos({ sellos, sitios, onNavigate, onSeleccionarSitio }) {
  const nivel = obtenerRango(sellos.length);
  const total = sitios.length;
  const progreso = total > 0 ? Math.round((sellos.length / total) * 100) : 0;

  const handleSeleccionar = (sitio) => {
    onSeleccionarSitio?.(sitio.id);
    onNavigate?.('detalleSello');
  };

  return (
    <div className="mis-sellos-wrapper">
      <TopBar title="Mis sellos">
        <span className="mis-sellos-rango" style={{ color: nivel.color, borderColor: nivel.color }}>
          {nivel.nombre}
        </span>
      </TopBar>

      <div className="mis-sellos-contenido">
        <div className="mis-sellos-progreso">
          <div className="mis-sellos-progreso-barra">
            <div
              className="mis-sellos-progreso-relleno"
              style={{ width: `${progreso}%` }}
            ></div>
          </div>
          <p>{sellos.length} de {total} sellos obtenidos ({progreso}%)</p>
        </div>

        <h2 className="seccion">PASAPORTE</h2>
        <div className="mis-sellos-grid">
          {sitios.map((sitio) => {
            const sello = sellos.find((s) => s.sitioId === sitio.id);

            if (sello) {
              return (
                <div
                  key={sitio.id}
                  className="sello-card obtenido"
                  onClick={() => handleSeleccionar(sitio)}
                  role="button"
                  tabIndex={0}
                >
                  <div className="sello-icono">🎭</div>
                  <strong>{sitio.name}</strong>
                  <span className="sello-fecha">{sello.fecha}</span>
                </div>
              );
            }

            return (
              <div key={sitio.id} className="sello-card bloqueado">
                <div className="sello-icono">🔒</div>
                <strong>{sitio.name}</strong>
                <span className="sello-fecha">Sin sellar</span>
              </div>
            );
          })}
        </div>

        <button className="mis-sellos-accion-btn" onClick={() => onNavigate?.('ranking')}>
          Ver ranking
        </button>
      </div>

      <BottomNav activo="pasaporte" onNavigate={onNavigate} />
    </div>
  );
}

export default MisSellos;