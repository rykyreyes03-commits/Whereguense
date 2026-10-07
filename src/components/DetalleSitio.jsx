import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, X, Heart, MapPin, Clock, Ticket, Sparkles, Lightbulb, Landmark, ChevronRight, Coins, Navigation, Route } from 'lucide-react';
import { FOTOS_SITIOS } from '../data/fotos';
import { INSIGNIAS } from '../data/insignias';
import { useSitioGaleria } from '../hooks/useSitioGaleria';
import SeccionResenasSitio from './SeccionResenasSitio';
import LightboxGaleria from './LightboxGaleria';
import RangoSello from './RangoSello';
import { useRangosSitios } from '../hooks/useRangosSitios';
import { rangoDeSello } from '../utils/rangosSello';
import guiaCabezon from '../assets/personajes/guiacabezon_dariana.png';
import guiaGigantona from '../assets/personajes/guiagigantona_dariana.png';
import './DetalleSitio.css';

const XP_POR_SELLO = 50;

function oraciones(texto) {
  return (texto || '').split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);
}

// Primeros ~150 caracteres de la historia, cortados en una palabra completa.
function datoCurioso(historia) {
  const t = (historia || '').replace(/\s+/g, ' ').trim();
  if (t.length <= 150) return t;
  const corte = t.slice(0, 150);
  return `${corte.slice(0, Math.max(corte.lastIndexOf(' '), 100)).replace(/[,;:\s]+$/, '')}…`;
}

// Hasta 4 puntos: las frases de la descripción corta y, para completar, lo que siempre es cierto de un sitio de la ruta.
function puntosClave(t, desc, nombreRuta) {
  const puntos = oraciones(desc).slice(0, 2).map((s) => s.replace(/[.]+$/, ''));
  puntos.push(t('sitio.puntoSello'));
  puntos.push(t('sitio.puntoRuta', { ruta: nombreRuta }));
  return puntos.slice(0, 4);
}

// Vista completa del sitio turístico (la que se abre desde el panel del mapa).
function DetalleSitio({
  sitio, estaGuardado, nombreRuta = null, onVolver, onCerrar, onGuardar, onHistoria, onVerRuta, onLlegar,
}) {
  const { t } = useTranslation();
  const { fotos, portadaUrl } = useSitioGaleria(sitio?.id);
  const rangos = useRangosSitios();
  const rangoSitio = rangoDeSello(rangos[sitio?.id]);
  const galeriaRef = useRef(null);
  const [fotoAbierta, setFotoAbierta] = useState(null); // índice de la foto en el lightbox
  if (!sitio) return null;

  const avatarElegido = localStorage.getItem('avatarElegido');
  const guia = avatarElegido === 'gigantona' ? guiaGigantona : guiaCabezon;
  const portada = portadaUrl || FOTOS_SITIOS[String(sitio.id)] || null;
  const insignia = INSIGNIAS[sitio.badge];
  const parrafos = [sitio.desc, oraciones(sitio.historia).slice(0, 2).join(' ')].filter(Boolean);
  const dato = datoCurioso(sitio.historia);
  const puntos = puntosClave(t, sitio.desc, nombreRuta || t('sitio.rutaDariana'));

  const deslizarGaleria = () => galeriaRef.current?.scrollBy({ left: 220, behavior: 'smooth' });

  return (
    <div className="sitio-detalle" role="dialog" aria-modal="true" aria-label={sitio.name}>
      <header className="sitio-detalle-hero">
        {portada && <img className="sitio-detalle-hero-foto" src={portada} alt="" />}
        <div className="sitio-detalle-hero-velo" />

        <button type="button" className="sitio-detalle-icono sitio-detalle-icono--izq" onClick={onVolver} aria-label={t('sitio.volverMapa')}>
          <ArrowLeft size={22} strokeWidth={2.2} aria-hidden="true" />
        </button>
        <div className="sitio-detalle-hero-acciones">
          <button
            type="button"
            className={`sitio-detalle-icono ${estaGuardado ? 'sitio-detalle-icono--activo' : ''}`}
            onClick={() => onGuardar(sitio)}
            aria-pressed={estaGuardado}
            aria-label={estaGuardado ? t('sitio.quitarAria') : t('sitio.guardarAria')}
          >
            <Heart size={21} strokeWidth={2.2} fill={estaGuardado ? 'currentColor' : 'none'} aria-hidden="true" />
          </button>
          <button type="button" className="sitio-detalle-icono" onClick={onCerrar} aria-label={t('comun.cerrar')}>
            <X size={22} strokeWidth={2.2} aria-hidden="true" />
          </button>
        </div>

        <img className="sitio-detalle-guia" src={guia} alt="" aria-hidden="true" />

        <div className="sitio-detalle-hero-texto">
          <span className="sitio-detalle-chip">{t('sitio.chip')}</span>
          <h2 className="sitio-detalle-nombre">{sitio.name}</h2>
          <p className="sitio-detalle-ciudad">
            <MapPin size={15} strokeWidth={2.2} aria-hidden="true" /> {t('sitio.ciudad')}
          </p>
        </div>
      </header>

      <div className="sitio-detalle-cuerpo">
        <dl className="sitio-detalle-datos">
          <div>
            <MapPin size={20} strokeWidth={2} aria-hidden="true" />
            <dt>{t('sitio.ubicacion')}</dt>
            <dd>{t('sitio.ubicacionValor')}</dd>
          </div>
          <div>
            <Clock size={20} strokeWidth={2} aria-hidden="true" />
            <dt>{t('sitio.visita')}</dt>
            <dd>{t('sitio.visitaValor')}</dd>
          </div>
          <div>
            <Ticket size={20} strokeWidth={2} aria-hidden="true" />
            <dt>{t('sitio.entrada')}</dt>
            <dd>{t('sitio.entradaLibre')}</dd>
          </div>
          <div>
            <Sparkles size={20} strokeWidth={2} aria-hidden="true" />
            <dt>{t('sitio.idealPara')}</dt>
            <dd>{t('sitio.turismo')}</dd>
          </div>
        </dl>

        <section className="sitio-detalle-card" aria-labelledby="sitio-sobre-titulo">
          <h3 id="sitio-sobre-titulo" className="sitio-detalle-titulo">{t('sitio.sobre')}</h3>
          {parrafos.map((p, i) => <p key={i} className="sitio-detalle-texto">{p}</p>)}
          {sitio.historia && (
            <button type="button" className="sitio-detalle-enlace" onClick={() => onHistoria(sitio)}>
              {t('sitio.leerHistoria')} <ChevronRight size={16} strokeWidth={2.4} aria-hidden="true" />
            </button>
          )}
        </section>

        <div className="sitio-detalle-pareja">
          {dato && (
            <section className="sitio-detalle-card sitio-detalle-card--dato" aria-labelledby="sitio-dato-titulo">
              <h3 id="sitio-dato-titulo" className="sitio-detalle-subtitulo">
                <Lightbulb size={17} strokeWidth={2.2} aria-hidden="true" /> {t('sitio.sabias')}
              </h3>
              <p className="sitio-detalle-texto">{dato}</p>
            </section>
          )}
          <section className="sitio-detalle-card sitio-detalle-card--importa" aria-labelledby="sitio-importa-titulo">
            <h3 id="sitio-importa-titulo" className="sitio-detalle-subtitulo">
              <Landmark size={17} strokeWidth={2.2} aria-hidden="true" /> {t('sitio.importante')}
            </h3>
            <ul className="sitio-detalle-puntos">
              {puntos.map((p) => <li key={p}>{p}</li>)}
            </ul>
          </section>
        </div>

        {fotos.length > 0 && (
          <section className="sitio-detalle-card" aria-labelledby="sitio-galeria-titulo">
            <h3 id="sitio-galeria-titulo" className="sitio-detalle-titulo">{t('sitio.galeria')}</h3>
            <div className="sitio-detalle-galeria-marco">
              <ul className="sitio-detalle-galeria" ref={galeriaRef}>
                {fotos.map((f, i) => (
                  <li key={f.id}>
                    <button type="button" className="sitio-detalle-galeria-foto" onClick={() => setFotoAbierta(i)} aria-label={t('sitio.verFoto', { i: i + 1, n: fotos.length })}>
                      <img src={f.url} alt={t('sitio.fotoAlt', { nombre: sitio.name, i: i + 1, n: fotos.length })} loading="lazy" />
                    </button>
                  </li>
                ))}
              </ul>
              {fotos.length > 2 && (
                <button type="button" className="sitio-detalle-galeria-flecha" onClick={deslizarGaleria} aria-label={t('sitio.verMasFotos')}>
                  <ChevronRight size={22} strokeWidth={2.4} aria-hidden="true" />
                </button>
              )}
            </div>
          </section>
        )}

        <section className="sitio-detalle-pasaporte" aria-label={t('sitio.pasaporteAria')}>
          {insignia && <img src={insignia} alt="" className="sitio-detalle-pasaporte-sello" />}
          <div className="sitio-detalle-pasaporte-texto">
            <span>{t('sitio.pasaporte')}</span>
            <strong>{t('sitio.visitaTexto')}</strong>
            <span className="sitio-detalle-rango">
              <RangoSello rango={rangoSitio.clave} />
              <span className="sitio-detalle-rango-nombre">{t('rango.selloMayus', { rango: t(`rango.${rangoSitio.clave}`).toUpperCase() })}</span>{' '}
              <span className="sitio-detalle-rango-puntos">· {t('rango.puntos', { count: rangoSitio.puntos })}</span>
            </span>
          </div>
          <span className="sitio-detalle-xp">
            <Coins size={16} strokeWidth={2.2} aria-hidden="true" /> +{XP_POR_SELLO} XP
          </span>
        </section>

        <SeccionResenasSitio sitioId={sitio.id} nombreSitio={sitio.name} />
      </div>

      {fotoAbierta != null && fotos[fotoAbierta] && (
        <LightboxGaleria
          fotos={fotos}
          indice={fotoAbierta}
          nombre={sitio.name}
          onCambiar={setFotoAbierta}
          onCerrar={() => setFotoAbierta(null)}
        />
      )}

      <div className="sitio-detalle-pie">
        <button type="button" className="sitio-detalle-btn sitio-detalle-btn--sec" onClick={() => onVerRuta(sitio)}>
          <Route size={18} strokeWidth={2.2} aria-hidden="true" /> {t('sitio.verRuta')}
        </button>
        <button type="button" className="sitio-detalle-btn sitio-detalle-btn--pri" onClick={() => onLlegar(sitio)}>
          <Navigation size={18} strokeWidth={2.2} aria-hidden="true" /> {t('sitio.llegar')}
        </button>
      </div>
    </div>
  );
}

export default DetalleSitio;
