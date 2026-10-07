import { useState, useMemo } from 'react';
import { User } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import './Inicio.css';
import TopBar from './TopBar';
import BottomNav from './BottomNav';
import { useGuardados } from '../hooks/useGuardados';
import { INSIGNIAS } from '../data/insignias';
import { hoyManagua, esDeEstaSemana } from '../utils/eventos';
import { esIngles } from '../utils/idioma';
import iconoBuscar from '../assets/icons/icono_buscar.svg';
import iconoArbol from '../assets/icons/icono_arbol.svg';
import iconoRuta from '../assets/icons/icono_ruta.svg';
import iconoRutaGuardada from '../assets/icons/icono_ruta_guardada.svg';
import iconoQR from '../assets/icons/icono_qr.svg';
import iconoPasaporte from '../assets/icons/icono_pasaporte.svg';

function formatearFechaCorta(iso) {
  if (!iso) return '';
  const [, m, d] = iso.split('-');
  return esIngles() ? `${m}/${d}` : `${d}/${m}`;
}

function Inicio({
  sitios,
  rutas,
  sellos,
  eventos,
  usuarioId,
  onNavigate,
  onSeleccionarRuta,
  onSeleccionarSitio,
  onVerSitioEnMapa,
  onSeleccionarEvento,
  eventoDestacadoId,
}) {
  const { t } = useTranslation();
  const [busqueda, setBusqueda] = useState('');
  // URL de portada que falló al cargar: la tarjeta vuelve a su diseño de siempre, sin foto.
  const [portadaFallida, setPortadaFallida] = useState(null);
  const { guardados } = useGuardados(usuarioId);


  const query = busqueda.trim().toLowerCase();
  const buscando = query.length > 0;
  const rutasCoincidentes = buscando ? rutas.filter((r) => r.nombre.toLowerCase().includes(query)) : [];
  const sitiosCoincidentes = buscando ? sitios.filter((s) => s.name.toLowerCase().includes(query)) : [];
  const eventosCoincidentes = buscando ? eventos.filter((e) => e.nombre.toLowerCase().includes(query)) : [];
  const sinResultados = buscando && rutasCoincidentes.length === 0 && sitiosCoincidentes.length === 0 && eventosCoincidentes.length === 0;

  const ultimoSello = sellos.length > 0 ? sellos[sellos.length - 1] : null;
  const rutaPrincipal = rutas[0];

  const eventoDestacado = useMemo(
    () => eventos?.find((e) => e.id === eventoDestacadoId) || null,
    [eventos, eventoDestacadoId]
  );
  // "Eventos de esta semana" mientras el destacado esté en curso o empiece en 7 días; si es más lejano, la sección dice "Próximo evento".
  const tituloEventos = !eventoDestacado || esDeEstaSemana(eventoDestacado, hoyManagua()) ? t('inicio.eventosSemana') : t('inicio.proximoEvento');
  // Evento con foto: la tarjeta lleva la foto de fondo (criterio de DetalleEvento).
  const eventoConFoto = Boolean(eventoDestacado?.imagenUrl) && portadaFallida !== eventoDestacado.imagenUrl;

  const handleUltimoSello = () => {
    if (!ultimoSello) return;
    onSeleccionarSitio?.(ultimoSello.sitioId);
    onNavigate?.('detalleSello');
  };

  const handleUltimaRuta = () => {
    if (!rutaPrincipal) return;
    onSeleccionarRuta?.(rutaPrincipal.id);
    onNavigate?.('detalleRuta');
  };

  const handleEscanear = () => {
    onNavigate?.('escanearQR');
  };

  const irARuta = (rutaId) => {
    onSeleccionarRuta?.(rutaId);
    onNavigate?.('detalleRuta');
  };

  const irAEvento = () => onNavigate?.('eventos');

  const irAlMapa = () => onNavigate?.('mapa');

  const totalSellos = sitios.length;

  return (
    <div className="inicio-wrapper">
      <TopBar
        onMenuClick={() => onNavigate?.('menu')}
        rightSlot={
          <button
            className="inicio-avatar-btn"
            onClick={() => onNavigate?.('perfil')}
            aria-label={t('inicio.perfil')}
          >
            <User size={22} strokeWidth={2.2} aria-hidden="true" />
          </button>
        }
      />

      <header className="inicio-hero">
        <div className="inicio-hero-texto">
          <span className="inicio-hero-eyebrow">{t('inicio.eyebrow')}</span>
          <h1 className="inicio-hero-titulo">{t('inicio.hola')}</h1>
          <p className="inicio-hero-sub">{t('inicio.subtitulo')}</p>
        </div>
        <div className="inicio-hero-progreso" aria-label={t('inicio.progresoAria', { n: sellos.length, total: totalSellos })}>
          <span className="inicio-hero-progreso-num">{sellos.length}</span>
          <span className="inicio-hero-progreso-label">{t('inicio.progresoLabel', { total: totalSellos })}</span>
        </div>
      </header>

      <div className="inicio-contenido">
        <div className="inicio-buscador">
          <img src={iconoBuscar} alt="" />
          <input
            type="text"
            placeholder={t('inicio.buscarPlaceholder')}
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            aria-label={t('inicio.buscarAria')}
          />
          {busqueda && (
            <button
              className="inicio-buscador-limpiar"
              onClick={() => setBusqueda('')}
              aria-label={t('inicio.limpiarBusqueda')}
            >
              ×
            </button>
          )}
        </div>

        {buscando && (
          <div className="inicio-resultados">
            {rutasCoincidentes.map((r) => (
              <button key={`ruta-${r.id}`} className="inicio-resultado" onClick={() => irARuta(r.id)}>
                <span className="inicio-resultado-titulo">{r.nombre}</span>
                <span className="inicio-resultado-tipo">{t('inicio.tipoRuta')}</span>
              </button>
            ))}
            {sitiosCoincidentes.map((s) => (
              <button key={`sitio-${s.id}`} className="inicio-resultado" onClick={() => onVerSitioEnMapa?.(s.id)}>
                <span className="inicio-resultado-titulo">{s.name}</span>
                <span className="inicio-resultado-tipo">{t('inicio.tipoSitio')}</span>
              </button>
            ))}
            {eventosCoincidentes.map((e) => (
              <button key={`evento-${e.id}`} className="inicio-resultado" onClick={() => irAEvento(e)}>
                <span className="inicio-resultado-titulo">{e.nombre}</span>
                <span className="inicio-resultado-tipo">{t('inicio.tipoEvento')}</span>
              </button>
            ))}
            {sinResultados && (
              <div className="inicio-resultado-vacio">
                {t('inicio.sinResultados', { q: busqueda })}
              </div>
            )}
          </div>
        )}

        <h2 className="inicio-seccion">{t('inicio.accesos')}</h2>
        <div className="inicio-accesos">
          <button
            type="button"
            className={`inicio-acceso ${ultimoSello ? '' : 'inicio-acceso--vacio'}`}
            onClick={handleUltimoSello}
            disabled={!ultimoSello}
          >
            <span className="inicio-acceso-icono"><img src={iconoArbol} alt="" /></span>
            <span className="inicio-acceso-label">{t('inicio.ultimoSello')}</span>
            <span className="inicio-acceso-meta">
              {ultimoSello ? t('inicio.verDetalle') : t('inicio.sinSellosAun')}
            </span>
          </button>

          <button
            type="button"
            className="inicio-acceso"
            onClick={handleUltimaRuta}
            disabled={!rutaPrincipal}
          >
            <span className="inicio-acceso-icono"><img src={iconoRuta} alt="" /></span>
            <span className="inicio-acceso-label">{t('inicio.ultimaRuta')}</span>
            <span className="inicio-acceso-meta">{rutaPrincipal?.nombre || '—'}</span>
          </button>

          <button
            type="button"
            className={`inicio-acceso ${guardados.length === 0 ? 'inicio-acceso--vacio' : ''}`}
            onClick={() => onNavigate?.('guardados')}
            disabled={guardados.length === 0}
          >
            <span className="inicio-acceso-icono"><img src={iconoRutaGuardada} alt="" /></span>
            <span className="inicio-acceso-label">{t('inicio.guardados')}</span>
            <span className="inicio-acceso-meta">
              {guardados.length > 0
                ? t('inicio.guardados', { count: guardados.length })
                : t('inicio.nadaGuardado')}
            </span>
          </button>

          <button type="button" className="inicio-acceso" onClick={handleEscanear}>
            <span className="inicio-acceso-icono"><img src={iconoQR} alt="" /></span>
            <span className="inicio-acceso-label">{t('inicio.escanear')}</span>
            <span className="inicio-acceso-meta">{t('inicio.selloOCupon')}</span>
          </button>
        </div>

        {sellos.length === 0 && (
          <div className="inicio-banner-bienvenida" role="region" aria-label={t('inicio.bannerAria')}>
            <span className="inicio-banner-bienvenida-icono" aria-hidden="true">
              <img src={iconoPasaporte} alt="" />
            </span>
            <div className="inicio-banner-bienvenida-texto">
              <strong>{t('inicio.bannerTitulo')}</strong>
              <span>{t('inicio.bannerTexto')}</span>
            </div>
            <button className="inicio-banner-bienvenida-btn" onClick={irAlMapa}>
              {t('inicio.abrirMapa')}
            </button>
          </div>
        )}

        <div className="inicio-seccion-header">
          <h2 className="inicio-seccion">{t('inicio.rutasDestacadas')}</h2>
          <button className="inicio-ver-todas" onClick={() => onNavigate?.('rutas')}>
            {t('inicio.verTodas')}
          </button>
        </div>

        {rutas.length > 0 && rutaPrincipal ? (
          <article
            className="inicio-card"
            onClick={() => { onSeleccionarRuta?.(rutaPrincipal.id); onNavigate?.('detalleRuta'); }}
            role="button"
            tabIndex={0}
          >
            <div className="inicio-card-media inicio-card-media--ruta" aria-hidden="true">
              <img src={INSIGNIAS.cathedral} alt="" />
            </div>
            <div className="inicio-card-body">
              <div className="inicio-card-eyebrow">{t('inicio.rutaPrincipal')}</div>
              <h3 className="inicio-card-titulo">{rutaPrincipal.nombre}</h3>
              <div className="inicio-card-ubicacion">{rutaPrincipal.ciudad}</div>
              <div className="inicio-card-pills">
                <span className="inicio-pill">{t('inicio.nSitios', { count: sitios.length })}</span>
                <span className="inicio-pill inicio-pill--folk">
                  {t('inicio.nSellados', { count: sellos.length })}
                </span>
              </div>
            </div>
          </article>
        ) : (
          <div className="inicio-empty">
            <div className="inicio-empty-icono" aria-hidden="true">🧭</div>
            <h3>{t('inicio.sinRutasTitulo')}</h3>
            <p>{t('inicio.sinRutasTexto')}</p>
            <button className="inicio-empty-btn" onClick={irAlMapa}>
              {t('inicio.explorarMapa')}
            </button>
          </div>
        )}

        <div className="inicio-seccion-header">
          <h2 className="inicio-seccion">{tituloEventos}</h2>
          <button className="inicio-ver-todas" onClick={() => onNavigate?.('eventos')}>
            {t('inicio.verTodos')}
          </button>
        </div>

        {eventoDestacado ? (
          <article
            className={`inicio-card ${eventoConFoto ? 'inicio-card--foto' : ''}`}
            onClick={() => { onSeleccionarEvento?.(eventoDestacado.id); onNavigate?.('detalleEvento'); }}
            role="button"
            tabIndex={0}
          >
            {eventoConFoto ? (
              <img
                className="inicio-card-portada"
                src={eventoDestacado.imagenUrl}
                alt=""
                loading="lazy"
                onError={() => setPortadaFallida(eventoDestacado.imagenUrl)}
              />
            ) : (
              <div className="inicio-card-media inicio-card-media--evento" aria-hidden="true">
                <img src={INSIGNIAS.sun} alt="" />
              </div>
            )}
            <div className="inicio-card-body">
              <div className="inicio-card-eyebrow">{t('inicio.evento')}</div>
              <h3 className="inicio-card-titulo">{eventoDestacado.nombre}</h3>
              <div className="inicio-card-ubicacion">{eventoDestacado.ubicacion}</div>
              <div className="inicio-card-pills">
                <span className="inicio-pill">
                  {formatearFechaCorta(eventoDestacado.fechaInicio)} – {formatearFechaCorta(eventoDestacado.fechaFin)}
                </span>
              </div>
            </div>
          </article>
        ) : (
          <div className="inicio-empty">
            <div className="inicio-empty-icono" aria-hidden="true">🎉</div>
            <h3>{t('inicio.sinEventosTitulo')}</h3>
            <p>{t('inicio.sinEventosTexto')}</p>
            <button className="inicio-empty-btn inicio-empty-btn--ghost" onClick={() => onNavigate?.('eventos')}>
              {t('inicio.verAgenda')}
            </button>
          </div>
        )}
      </div>

      <BottomNav activo="inicio" onNavigate={onNavigate} />
    </div>
  );
}

export default Inicio;
