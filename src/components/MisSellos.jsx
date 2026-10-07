import { Ticket, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import './MisSellos.css';
import TopBar from './TopBar';
import BottomNav from './BottomNav';
import { obtenerRango } from '../utils/rango';
import { INSIGNIAS } from '../data/insignias';
import { useRangosSitios } from '../hooks/useRangosSitios';
import NivelProgreso from './NivelProgreso';
import RangoSello from './RangoSello';
import { localeFechas } from '../utils/idioma';

function MisSellos({ sellos, sitios, onNavigate, onSeleccionarSitio, sitioResaltadoId, cuponesDisponibles = 0, nivelInfo = null }) {
  const { t } = useTranslation();
  const nivel = obtenerRango(sellos.length);
  const rangos = useRangosSitios();
  const total = sitios.length;
  const progreso = total > 0 ? Math.round((sellos.length / total) * 100) : 0;

  const handleSeleccionar = (sitio) => {
    onSeleccionarSitio?.(sitio.id);
    onNavigate?.('detalleSello');
  };

  return (
    <div className="mis-sellos-wrapper">
      <TopBar title={t('pasaporte.titulo')} onMenuClick={() => onNavigate?.('menu')}>
        <span className="mis-sellos-rango" style={{ color: nivel.color, borderColor: nivel.color }}>
          {t(`rangosUsuario.${nivel.clave}`)}
        </span>
      </TopBar>

      <div className="mis-sellos-contenido">
        {nivelInfo && <NivelProgreso info={nivelInfo} />}

        <div className="mis-sellos-progreso">
          <div className="mis-sellos-progreso-barra">
            <div
              className="mis-sellos-progreso-relleno"
              style={{ width: `${progreso}%` }}
            ></div>
          </div>
          <p>{t('pasaporte.progreso', { n: sellos.length, total, pct: progreso })}</p>
        </div>

        <button className="mis-sellos-cupones" type="button" onClick={() => onNavigate?.('misCupones')}>
          <span className="mis-sellos-cupones-icono" aria-hidden="true"><Ticket size={22} strokeWidth={1.8} /></span>
          <span className="mis-sellos-cupones-texto">
            <strong>{t('pasaporte.cupones')}</strong>
            <small>
              {cuponesDisponibles > 0
                ? t('pasaporte.cuponesDisponibles', { count: cuponesDisponibles })
                : t('pasaporte.cuponesDescuentos')}
            </small>
          </span>
          <ChevronRight size={18} strokeWidth={2} aria-hidden="true" />
        </button>

        <h2 className="seccion">{t('pasaporte.seccion')}</h2>
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
                  <span className="sello-fecha">{sello.fechaIso ? new Date(sello.fechaIso).toLocaleDateString(localeFechas()) : sello.fecha}</span>
                  <RangoSello rango={rangos[sitio.id]} conNombre />
                </div>
              );
            }

            return (
              <div key={sitio.id} className="sello-card bloqueado">
                <img
                  className="sello-icono"
                  src={INSIGNIAS[sitio.badge]}
                  alt={t('pasaporte.bloqueado', { nombre: sitio.name })}
                />
                <strong>{sitio.name}</strong>
                <span className="sello-fecha">{t('pasaporte.sinSellar')}</span>
                <RangoSello rango={rangos[sitio.id]} conNombre />
              </div>
            );
          })}
        </div>

        <button className="mis-sellos-accion-btn" onClick={() => onNavigate?.('ranking')}>
          {t('pasaporte.verRanking')}
        </button>
      </div>

      <BottomNav activo="pasaporte" onNavigate={onNavigate} />
    </div>
  );
}

export default MisSellos;