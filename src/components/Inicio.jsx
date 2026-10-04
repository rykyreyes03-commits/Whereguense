import { useState, useMemo } from 'react';
import './Inicio.css';
import TopBar from './TopBar';
import BottomNav from './BottomNav';
import { useGuardados } from '../hooks/useGuardados';
import { INSIGNIAS } from '../data/insignias';
import iconoCabezon from '../assets/icons/icono_cabezon.svg';
import iconoGigantona from '../assets/icons/icono_gigantona.svg';
import iconoBuscar from '../assets/icons/icono_buscar.svg';
import iconoArbol from '../assets/icons/icono_arbol.svg';
import iconoRuta from '../assets/icons/icono_ruta.svg';
import iconoRutaGuardada from '../assets/icons/icono_ruta_guardada.svg';
import iconoQR from '../assets/icons/icono_qr.svg';
import iconoPasaporte from '../assets/icons/icono_pasaporte.svg';

function formatearFechaCorta(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}`;
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
  const [busqueda, setBusqueda] = useState('');
  // URL de portada que falló al cargar: la tarjeta vuelve a su diseño de siempre, sin foto.
  const [portadaFallida, setPortadaFallida] = useState(null);
  const { guardados } = useGuardados(usuarioId);

  const iconoAvatar = localStorage.getItem('avatarElegido') === 'gigantona' ? iconoGigantona : iconoCabezon;

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
            onClick={() => onNavigate?.('personalizacion')}
            aria-label="Personalizar avatar"
          >
            <img src={iconoAvatar} alt="" />
          </button>
        }
      />

      <header className="inicio-hero">
        <div className="inicio-hero-texto">
          <span className="inicio-hero-eyebrow">RUTAS DARIANAS</span>
          <h1 className="inicio-hero-titulo">Hola, Explorador</h1>
          <p className="inicio-hero-sub">¿Qué quieres descubrir hoy en León?</p>
        </div>
        <div className="inicio-hero-progreso" aria-label={`${sellos.length} de ${totalSellos} sellos`}>
          <span className="inicio-hero-progreso-num">{sellos.length}</span>
          <span className="inicio-hero-progreso-label">de {totalSellos} sellos</span>
        </div>
      </header>

      <div className="inicio-contenido">
        <div className="inicio-buscador">
          <img src={iconoBuscar} alt="" />
          <input
            type="text"
            placeholder="Buscar rutas, sitios, eventos..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            aria-label="Buscar"
          />
          {busqueda && (
            <button
              className="inicio-buscador-limpiar"
              onClick={() => setBusqueda('')}
              aria-label="Limpiar búsqueda"
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
                <span className="inicio-resultado-tipo">Ruta</span>
              </button>
            ))}
            {sitiosCoincidentes.map((s) => (
              <button key={`sitio-${s.id}`} className="inicio-resultado" onClick={() => onVerSitioEnMapa?.(s.id)}>
                <span className="inicio-resultado-titulo">{s.name}</span>
                <span className="inicio-resultado-tipo">Sitio</span>
              </button>
            ))}
            {eventosCoincidentes.map((e) => (
              <button key={`evento-${e.id}`} className="inicio-resultado" onClick={() => irAEvento(e)}>
                <span className="inicio-resultado-titulo">{e.nombre}</span>
                <span className="inicio-resultado-tipo">Evento</span>
              </button>
            ))}
            {sinResultados && (
              <div className="inicio-resultado-vacio">
                Sin resultados para &ldquo;{busqueda}&rdquo;
              </div>
            )}
          </div>
        )}

        <h2 className="inicio-seccion">Accesos rápidos</h2>
        <div className="inicio-accesos">
          <button
            type="button"
            className={`inicio-acceso ${ultimoSello ? '' : 'inicio-acceso--vacio'}`}
            onClick={handleUltimoSello}
            disabled={!ultimoSello}
          >
            <span className="inicio-acceso-icono"><img src={iconoArbol} alt="" /></span>
            <span className="inicio-acceso-label">Último sello</span>
            <span className="inicio-acceso-meta">
              {ultimoSello ? 'Ver detalle' : 'Sin sellos aún'}
            </span>
          </button>

          <button
            type="button"
            className="inicio-acceso"
            onClick={handleUltimaRuta}
            disabled={!rutaPrincipal}
          >
            <span className="inicio-acceso-icono"><img src={iconoRuta} alt="" /></span>
            <span className="inicio-acceso-label">Última ruta</span>
            <span className="inicio-acceso-meta">{rutaPrincipal?.nombre || '—'}</span>
          </button>

          <button
            type="button"
            className={`inicio-acceso ${guardados.length === 0 ? 'inicio-acceso--vacio' : ''}`}
            onClick={() => onNavigate?.('guardados')}
            disabled={guardados.length === 0}
          >
            <span className="inicio-acceso-icono"><img src={iconoRutaGuardada} alt="" /></span>
            <span className="inicio-acceso-label">Guardados</span>
            <span className="inicio-acceso-meta">
              {guardados.length > 0
                ? `${guardados.length} guardado${guardados.length === 1 ? '' : 's'}`
                : 'Aún no guardas nada'}
            </span>
          </button>

          <button type="button" className="inicio-acceso" onClick={handleEscanear}>
            <span className="inicio-acceso-icono"><img src={iconoQR} alt="" /></span>
            <span className="inicio-acceso-label">Escanear</span>
            <span className="inicio-acceso-meta">Sello o cupón</span>
          </button>
        </div>

        {sellos.length === 0 && (
          <div className="inicio-banner-bienvenida" role="region" aria-label="Invitación a explorar">
            <span className="inicio-banner-bienvenida-icono" aria-hidden="true">
              <img src={iconoPasaporte} alt="" />
            </span>
            <div className="inicio-banner-bienvenida-texto">
              <strong>Aún no tienes sellos</strong>
              <span>Visita un sitio en el mapa para comenzar la aventura.</span>
            </div>
            <button className="inicio-banner-bienvenida-btn" onClick={irAlMapa}>
              Abrir mapa
            </button>
          </div>
        )}

        <div className="inicio-seccion-header">
          <h2 className="inicio-seccion">Rutas destacadas</h2>
          <button className="inicio-ver-todas" onClick={() => onNavigate?.('rutas')}>
            Ver todas
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
              <div className="inicio-card-eyebrow">RUTA PRINCIPAL</div>
              <h3 className="inicio-card-titulo">{rutaPrincipal.nombre}</h3>
              <div className="inicio-card-ubicacion">{rutaPrincipal.ciudad}</div>
              <div className="inicio-card-pills">
                <span className="inicio-pill">{sitios.length} sitios</span>
                <span className="inicio-pill inicio-pill--folk">
                  {sellos.length} sellados
                </span>
              </div>
            </div>
          </article>
        ) : (
          <div className="inicio-empty">
            <div className="inicio-empty-icono" aria-hidden="true">🧭</div>
            <h3>Aún no hay rutas disponibles</h3>
            <p>Explora el mapa para descubrir sitios por tu cuenta y crear tu propia ruta.</p>
            <button className="inicio-empty-btn" onClick={irAlMapa}>
              Explorar mapa
            </button>
          </div>
        )}

        <div className="inicio-seccion-header">
          <h2 className="inicio-seccion">Eventos de esta semana</h2>
          <button className="inicio-ver-todas" onClick={() => onNavigate?.('eventos')}>
            Ver todos
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
              <div className="inicio-card-eyebrow">EVENTO</div>
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
            <h3>Sin eventos esta semana</h3>
            <p>Vuelve pronto: la agenda cultural de León se actualiza cada semana.</p>
            <button className="inicio-empty-btn inicio-empty-btn--ghost" onClick={() => onNavigate?.('eventos')}>
              Ver agenda completa
            </button>
          </div>
        )}
      </div>

      <BottomNav activo="inicio" onNavigate={onNavigate} />
    </div>
  );
}

export default Inicio;
