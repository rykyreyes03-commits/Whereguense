import { useState } from 'react';
import { Ticket, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import './MisSellos.css';
import TopBar from './TopBar';
import BottomNav from './BottomNav';
import NivelProgreso from './NivelProgreso';
import SellosCiudad from './SellosCiudad';
import ModalProximamente from './ModalProximamente';
import { obtenerRango } from '../utils/rango';
import { CIUDADES, ciudadDeSitio, conteoDeCiudad } from '../utils/ciudades';
import { useRangosSitios, useCiudadesSitios } from '../hooks/useRangosSitios';

// Pantalla del pasaporte: nivel, cupones y una tarjeta por ciudad. León abre sus sellos; las demás avisan que vienen pronto.
function MisSellos({ sellos, sitios, onNavigate, onSeleccionarSitio, sitioResaltadoId, cuponesDisponibles = 0, nivelInfo = null }) {
  const { t } = useTranslation();
  const nivel = obtenerRango(sellos.length);
  const rangos = useRangosSitios();
  const ciudadesBD = useCiudadesSitios();
  const total = sitios.length;
  const progreso = total > 0 ? Math.round((sellos.length / total) * 100) : 0;

  // Si se llega por el aviso de un sello recién obtenido, se abre directo la ciudad de ese sitio.
  const [ciudadAbierta, setCiudadAbierta] = useState(() => {
    const sitio = sitioResaltadoId != null ? sitios.find((s) => s.id === sitioResaltadoId) : null;
    return sitio ? CIUDADES.find((c) => c.nombre === ciudadDeSitio(sitio)) || null : null;
  });
  const [ciudadProximamente, setCiudadProximamente] = useState(null);

  const abrirCiudad = (ciudad) => {
    const { total: sitiosDeLaCiudad } = conteoDeCiudad(ciudad, sitios, sellos, ciudadesBD);
    if (sitiosDeLaCiudad > 0) setCiudadAbierta(ciudad);
    else setCiudadProximamente(ciudad);
  };

  if (ciudadAbierta) {
    return (
      <SellosCiudad
        ciudad={ciudadAbierta}
        sitios={sitios.filter((s) => ciudadDeSitio(s, ciudadesBD) === ciudadAbierta.nombre)}
        sellos={sellos}
        rangos={rangos}
        sitioResaltadoId={sitioResaltadoId}
        onVolver={() => setCiudadAbierta(null)}
        onNavigate={onNavigate}
        onSeleccionarSitio={onSeleccionarSitio}
      />
    );
  }

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
        <ul className="ciudades-lista">
          {CIUDADES.map((ciudad) => {
            const { total: sitiosDeLaCiudad, obtenidos } = conteoDeCiudad(ciudad, sitios, sellos, ciudadesBD);
            const contador = sitiosDeLaCiudad > 0
              ? t('pasaporte.ciudadSellos', { n: obtenidos, total: sitiosDeLaCiudad })
              : t('pasaporte.ciudadProximamente');
            return (
              <li key={ciudad.id}>
                <button
                  type="button"
                  className={`ciudad-card ${sitiosDeLaCiudad > 0 ? '' : 'ciudad-card--pronto'}`}
                  onClick={() => abrirCiudad(ciudad)}
                  aria-label={`${ciudad.nombre}. ${contador}`}
                >
                  <img className="ciudad-card-imagen" src={ciudad.imagen} alt="" loading="lazy" />
                  <span className="ciudad-card-nombre">{ciudad.nombre}</span>
                  <span className="ciudad-card-contador">{contador}</span>
                </button>
              </li>
            );
          })}
        </ul>

        <button className="mis-sellos-accion-btn" onClick={() => onNavigate?.('ranking')}>
          {t('pasaporte.verRanking')}
        </button>
      </div>

      <BottomNav activo="pasaporte" onNavigate={onNavigate} />

      {ciudadProximamente && (
        <ModalProximamente ciudad={ciudadProximamente.nombre} onCerrar={() => setCiudadProximamente(null)} />
      )}
    </div>
  );
}

export default MisSellos;
