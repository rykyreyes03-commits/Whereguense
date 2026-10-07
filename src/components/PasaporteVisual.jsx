import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import './PasaporteVisual.css';
import baseImg from '../assets/pasaporte_base.png';
// Los mismos personajes del perfil, recortados a su contenido para que llenen el marco de la foto
import cabezonImg from '../assets/pasaporte_avatar_cabezon.webp';
import gigantonaImg from '../assets/pasaporte_avatar_gigantona.webp';
import { INSIGNIAS } from '../data/insignias';
import { rutaFavorita, numeroDePasaporte } from '../utils/pasaporte';

const MAX_SELLOS = 6;

// Lo que guarda el navegador: la foto de perfil (si subió una) y el personaje que eligió al registrarse.
function leerLocal(clave) {
  try {
    return localStorage.getItem(clave) || null;
  } catch {
    return null;
  }
}

// El pasaporte de viajero: la imagen del documento con los datos del usuario encima y sus sellos con la marca SELLADO.
//   usuario: { id, nombre_usuario, avatar_personaje }, sellos: los del usuario, sitios: todos, rutas: [{ nombre, sitios }].
function PasaporteVisual({ usuario, sellos, sitios, rutas, onCerrar }) {
  const { t } = useTranslation();
  const cerrarRef = useRef(null);
  const accionRef = useRef(onCerrar);
  useEffect(() => { accionRef.current = onCerrar; });

  useEffect(() => {
    const previo = document.activeElement;
    cerrarRef.current?.focus();
    const alTeclear = (e) => {
      if (e.key === 'Escape') { e.stopPropagation(); accionRef.current(); }
    };
    window.addEventListener('keydown', alTeclear, true);
    const overflowPrevio = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', alTeclear, true);
      document.body.style.overflow = overflowPrevio;
      if (previo && document.contains(previo)) previo.focus();
    };
  }, []);

  const nombre = usuario?.nombre_usuario || t('pasaporteVisual.invitado');
  const fotoPerfil = leerLocal('fotoPerfil');
  const personaje = usuario?.avatar_personaje || leerLocal('avatarElegido');
  const avatar = String(personaje || '').includes('gigantona') ? gigantonaImg : cabezonImg;
  const ruta = rutaFavorita(rutas, sellos);

  const sitiosPorId = Object.fromEntries(sitios.map((s) => [s.id, s]));
  const deSitio = sellos.filter((s) => s.sitioId != null && sitiosPorId[s.sitioId]);
  const mostrados = deSitio.slice(0, MAX_SELLOS);
  const resto = Math.max(0, deSitio.length - MAX_SELLOS);

  return createPortal(
    <div className="pasaporte-fondo" onClick={(e) => { if (e.target === e.currentTarget) onCerrar(); }}>
      <button ref={cerrarRef} type="button" className="pasaporte-cerrar" onClick={onCerrar} aria-label={t('pasaporteVisual.cerrar')}>
        <X size={24} strokeWidth={2.4} aria-hidden="true" />
      </button>

      <div
        className="pasaporte-doc"
        style={{ backgroundImage: `url(${baseImg})` }}
        role="dialog"
        aria-modal="true"
        aria-label={t('pasaporteVisual.aria', { nombre })}
      >
        <span className="pasaporte-numero">{numeroDePasaporte(usuario?.id)}</span>

        <div className="pasaporte-foto">
          {fotoPerfil
            ? <img className="pasaporte-foto-img pasaporte-foto-img--perfil" src={fotoPerfil} alt={t('perfil.fotoAlt')} />
            : <img className="pasaporte-foto-img" src={avatar} alt="" />}
        </div>

        <span className="pasaporte-valor pasaporte-valor--nombre">{nombre}</span>
        <span className="pasaporte-valor pasaporte-valor--nacionalidad">Nicaragua</span>
        <span className="pasaporte-valor pasaporte-valor--sellos">{sellos.length}</span>
        <span className="pasaporte-valor pasaporte-valor--ruta">{ruta ? ruta.nombre : t('pasaporteVisual.sinRuta')}</span>

        {mostrados.map((sello, i) => {
          const sitio = sitiosPorId[sello.sitioId];
          return (
            <div key={sello.id ?? sello.sitioId} className={`pasaporte-sello pasaporte-sello--${i}`} title={sitio.name}>
              <img className="pasaporte-sello-insignia" src={INSIGNIAS[sitio.badge]} alt={sitio.name} />
              <span className="pasaporte-sello-marca" aria-hidden="true"><span>{t('pasaporteVisual.sellado')}</span></span>
            </div>
          );
        })}

        {resto > 0 && <span className="pasaporte-mas" aria-label={t('pasaporteVisual.masAria', { n: resto })}>+{resto}</span>}
      </div>
    </div>,
    document.body,
  );
}

export default PasaporteVisual;
