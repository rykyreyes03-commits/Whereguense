import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import './MisSellos.css';
import './SellosCiudad.css';
import TopBar from './TopBar';
import BottomNav from './BottomNav';
import RangoSello from './RangoSello';
import { INSIGNIAS } from '../data/insignias';
import { localeFechas } from '../utils/idioma';

// Los sellos de una ciudad: todos sus sitios con su insignia, su rango y si ya se obtuvieron, o solo los obtenidos.
//   sitios: los sitios de esa ciudad (ya filtrados), sellos: los del usuario, rangos: { [sitioId]: 'cobre' | 'plata' | 'oro' }.
function SellosCiudad({ ciudad, sitios, sellos, rangos, sitioResaltadoId, onVolver, onNavigate, onSeleccionarSitio }) {
  const { t } = useTranslation();
  const [pestana, setPestana] = useState('todos'); // 'todos' | 'mios'

  const selloDe = (sitio) => sellos.find((s) => s.sitioId === sitio.id);
  const obtenidos = sitios.filter((s) => selloDe(s));
  const visibles = pestana === 'mios' ? obtenidos : sitios;

  const abrirSitio = (sitio) => {
    onSeleccionarSitio?.(sitio.id);
    onNavigate?.('detalleSello');
  };

  return (
    <div className="mis-sellos-wrapper">
      <TopBar title={t('sellosCiudad.titulo', { ciudad: ciudad.nombre })} onBack={onVolver}>
        <span className="sellos-ciudad-contador">{t('pasaporte.ciudadSellos', { n: obtenidos.length, total: sitios.length })}</span>
      </TopBar>

      <div className="mis-sellos-contenido">
        <div className="sellos-ciudad-tabs" role="tablist" aria-label={t('sellosCiudad.tabsAria', { ciudad: ciudad.nombre })}>
          {[
            { id: 'todos', etiqueta: t('sellosCiudad.todos'), cuantos: sitios.length },
            { id: 'mios', etiqueta: t('sellosCiudad.mios'), cuantos: obtenidos.length },
          ].map(({ id, etiqueta, cuantos }) => (
            <button
              key={id}
              type="button"
              role="tab"
              id={`sellos-tab-${id}`}
              aria-selected={pestana === id}
              aria-controls="sellos-panel"
              className={`sellos-ciudad-tab ${pestana === id ? 'activo' : ''}`}
              onClick={() => setPestana(id)}
            >
              {etiqueta} <span className="sellos-ciudad-tab-cuenta">{cuantos}</span>
            </button>
          ))}
        </div>

        <div id="sellos-panel" role="tabpanel" aria-labelledby={`sellos-tab-${pestana}`}>
          {visibles.length === 0 ? (
            <div className="sellos-ciudad-vacio">
              <strong>{t('sellosCiudad.vacioTitulo', { ciudad: ciudad.nombre })}</strong>
              <span>{t('sellosCiudad.vacioTexto')}</span>
            </div>
          ) : (
            <div className="mis-sellos-grid">
              {visibles.map((sitio) => {
                const sello = selloDe(sitio);
                const fecha = sello ? (sello.fechaIso ? new Date(sello.fechaIso).toLocaleDateString(localeFechas()) : sello.fecha) : null;
                if (sello) {
                  return (
                    <div
                      key={sitio.id}
                      className={`sello-card obtenido ${sitio.id === sitioResaltadoId ? 'recien-obtenido' : ''}`}
                      onClick={() => abrirSitio(sitio)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); abrirSitio(sitio); }
                      }}
                      role="button"
                      tabIndex={0}
                    >
                      <img className="sello-icono" src={INSIGNIAS[sitio.badge]} alt={sitio.name} />
                      <strong>{sitio.name}</strong>
                      <span className="sello-fecha">{t('sellosCiudad.obtenidoEl', { fecha })}</span>
                      <RangoSello rango={rangos[sitio.id]} conNombre />
                    </div>
                  );
                }
                return (
                  <div key={sitio.id} className="sello-card bloqueado">
                    <img className="sello-icono" src={INSIGNIAS[sitio.badge]} alt={t('pasaporte.bloqueado', { nombre: sitio.name })} />
                    <strong>{sitio.name}</strong>
                    <span className="sello-fecha">{t('pasaporte.sinSellar')}</span>
                    <RangoSello rango={rangos[sitio.id]} conNombre />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <BottomNav activo="pasaporte" onNavigate={onNavigate} />
    </div>
  );
}

export default SellosCiudad;
