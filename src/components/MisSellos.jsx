import { Ticket, ChevronRight } from 'lucide-react';
import './MisSellos.css';
import TopBar from './TopBar';
import BottomNav from './BottomNav';
import { obtenerRango } from '../utils/rango';
import { INSIGNIAS } from '../data/insignias';

function MisSellos({ sellos, sitios, onNavigate, onSeleccionarSitio, sitioResaltadoId, cuponesDisponibles = 0 }) {
  const nivel = obtenerRango(sellos.length);
  const total = sitios.length;
  const progreso = total > 0 ? Math.round((sellos.length / total) * 100) : 0;

  const handleSeleccionar = (sitio) => {
    onSeleccionarSitio?.(sitio.id);
    onNavigate?.('detalleSello');
  };

  return (
    <div className="mis-sellos-wrapper">
      <TopBar title="Mis sellos" onMenuClick={() => onNavigate?.('menu')}>
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

        <button className="mis-sellos-cupones" type="button" onClick={() => onNavigate?.('misCupones')}>
          <span className="mis-sellos-cupones-icono" aria-hidden="true"><Ticket size={22} strokeWidth={1.8} /></span>
          <span className="mis-sellos-cupones-texto">
            <strong>Mis cupones</strong>
            <small>
              {cuponesDisponibles > 0
                ? `${cuponesDisponibles} disponible${cuponesDisponibles === 1 ? '' : 's'}`
                : 'Descuentos de los negocios'}
            </small>
          </span>
          <ChevronRight size={18} strokeWidth={2} aria-hidden="true" />
        </button>

        <h2 className="seccion">PASAPORTE</h2>
        <div className="mis-sellos-grid">
          {sitios.map((sitio) => {
            const sello = sellos.find((s) => s.sitioId === sitio.id);

            if (sello) {
              return (
                <div
                  key={sitio.id}
                  className={`sello-card obtenido ${sitio.id === sitioResaltadoId ? 'recien-obtenido' : ''}`}
                  onClick={() => handleSeleccionar(sitio)}
                  role="button"
                  tabIndex={0}
                >
                  <img className="sello-icono" src={INSIGNIAS[sitio.badge]} alt={sitio.name} />
                  <strong>{sitio.name}</strong>
                  <span className="sello-fecha">{sello.fecha}</span>
                </div>
              );
            }

            return (
              <div key={sitio.id} className="sello-card bloqueado">
                <img
                  className="sello-icono"
                  src={INSIGNIAS[sitio.badge]}
                  alt={`${sitio.name} (sello bloqueado)`}
                />
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