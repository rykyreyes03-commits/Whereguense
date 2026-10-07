import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Edit2, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import './OnboardingCuaderno.css';
import './PasaporteVisual.css';
import baseImg from '../assets/pasaporte_base.png';
import logoW from '../assets/cuaderno_w.png';
import logoNombre from '../assets/cuaderno_nombre.png';
// Los mismos personajes del perfil, recortados a su contenido para que llenen el marco de la foto
import cabezonImg from '../assets/pasaporte_avatar_cabezon.webp';
import gigantonaImg from '../assets/pasaporte_avatar_gigantona.webp';
import PasaporteEdicion from './PasaporteEdicion';
import { INSIGNIAS } from '../data/insignias';
import { rutaFavorita, numeroDePasaporte } from '../utils/pasaporte';

const MAX_SELLOS = 6;
const MS_PORTADA = 1000; // la portada se ve este tiempo antes de abrirse
const MS_ABRIR = 850; // lo que dura la animación de abrir

// Lo que guarda el navegador: la foto de perfil (si subió una) y el personaje que eligió al registrarse.
function leerLocal(clave) {
  try {
    return localStorage.getItem(clave) || null;
  } catch {
    return null;
  }
}

// El pasaporte de viajero: la portada del cuaderno que se abre, y dentro el documento con los datos del usuario y sus sellos con la marca SELLADO.
//   usuario: { id, nombre_usuario, pais, avatar_personaje, foto_perfil_url, fecha_nacimiento, telefono, genero, idioma_preferido },
//   sellos: los del usuario, sitios: todos, rutas: [{ nombre, sitios }], nivel: número.
//   onGuardarPerfil(datos) -> Promise<boolean>: si viene (y hay usuario), aparece el lápiz para editar la información.
function PasaporteVisual({ usuario, sellos, sitios, rutas, nivel = 1, onGuardarPerfil = null, guardando = false, error = null, onCerrar }) {
  const { t, i18n } = useTranslation();
  const cerrarRef = useRef(null);
  const accionRef = useRef(onCerrar);
  useEffect(() => { accionRef.current = onCerrar; });
  const [fase, setFase] = useState('portada'); // portada -> abriendo -> interior, y editar

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

  // Portada 1 segundo, luego se abre
  useEffect(() => {
    if (fase === 'portada') {
      const id = setTimeout(() => setFase('abriendo'), MS_PORTADA);
      return () => clearTimeout(id);
    }
    if (fase === 'abriendo') {
      const id = setTimeout(() => setFase('interior'), MS_ABRIR);
      return () => clearTimeout(id);
    }
    return undefined;
  }, [fase]);

  const nombre = usuario?.nombre_usuario || t('pasaporteVisual.invitado');
  const pais = usuario?.pais || '—';
  const personaje = usuario?.avatar_personaje || leerLocal('avatarElegido');
  const avatar = String(personaje || '').includes('gigantona') ? gigantonaImg : cabezonImg;
  const fotoPerfil = usuario?.foto_perfil_url || leerLocal('fotoPerfil');
  const ruta = rutaFavorita(rutas, sellos);

  const sitiosPorId = Object.fromEntries(sitios.map((s) => [s.id, s]));
  const deSitio = sellos.filter((s) => s.sitioId != null && sitiosPorId[s.sitioId]);
  const mostrados = deSitio.slice(0, MAX_SELLOS);
  const resto = Math.max(0, deSitio.length - MAX_SELLOS);

  // Datos personales que dejó al registrarse (solo los que tiene)
  const personales = [];
  if (usuario?.fecha_nacimiento) {
    const [a, m, d] = usuario.fecha_nacimiento.split('-').map(Number);
    personales.push(t('pasaporteVisual.nacimiento', { fecha: new Date(a, m - 1, d).toLocaleDateString(i18n.language, { day: 'numeric', month: 'short', year: 'numeric' }) }));
  }
  if (usuario?.telefono) personales.push(t('pasaporteVisual.telefono', { numero: usuario.telefono }));
  if (usuario?.genero) personales.push(t(`pasaporteVisual.generos.${usuario.genero}`));

  const puedeEditar = Boolean(usuario && onGuardarPerfil);
  const enPortada = fase === 'portada' || fase === 'abriendo';

  return createPortal(
    <div className="pasaporte-fondo" onClick={(e) => { if (e.target === e.currentTarget) onCerrar(); }}>
      {puedeEditar && fase === 'interior' && (
        <button type="button" className="pasaporte-editar" onClick={() => setFase('editar')} aria-label={t('pasaporteVisual.editar')} title={t('pasaporteVisual.editar')}>
          <Edit2 size={20} strokeWidth={2.2} aria-hidden="true" />
        </button>
      )}
      <button ref={cerrarRef} type="button" className="pasaporte-cerrar" onClick={onCerrar} aria-label={t('pasaporteVisual.cerrar')}>
        <X size={24} strokeWidth={2.4} aria-hidden="true" />
      </button>

      {fase === 'editar' ? (
        <PasaporteEdicion
          usuario={usuario}
          vistaPrevia={fotoPerfil || avatar}
          guardando={guardando}
          error={error}
          onGuardar={onGuardarPerfil}
          onCancelar={() => setFase('interior')}
        />
      ) : (
        <div
          className="pasaporte-doc oc-vars"
          style={{ backgroundImage: `url(${baseImg})` }}
          role="dialog"
          aria-modal="true"
          aria-label={t('pasaporteVisual.aria', { nombre })}
        >
          <div className="pasaporte-interior" inert={enPortada}>
            <span className="pasaporte-numero"><span>#</span><span>{numeroDePasaporte(usuario?.id).slice(1)}</span></span>

            <div className="pasaporte-foto">
              {fotoPerfil
                ? <img className="pasaporte-foto-img pasaporte-foto-img--perfil" src={fotoPerfil} alt={t('perfil.fotoAlt')} />
                : <img className="pasaporte-foto-img" src={avatar} alt="" />}
            </div>

            <div className="pasaporte-datos">
              <span className="pasaporte-nombre">{nombre}</span>
              <span className="pasaporte-pais">
                {pais}
                {pais === 'Nicaragua' && (
                  <svg className="pasaporte-bandera" viewBox="0 0 30 20" aria-hidden="true">
                    <rect width="30" height="20" fill="#0067C6" />
                    <rect y="6.5" width="30" height="7" fill="#fff" />
                    <path d="M15 8.2l2 3.4h-4z" fill="#E0B100" />
                  </svg>
                )}
              </span>
              <span className="pasaporte-dato pasaporte-dato--nivel"><span aria-hidden="true">🌟</span> {t('pasaporteVisual.nivel', { n: nivel })}</span>
              <span className="pasaporte-dato pasaporte-dato--sellos"><span aria-hidden="true">🗺️</span> {t('pasaporteVisual.sellosDe', { n: deSitio.length, total: sitios.length })}</span>
              <span className="pasaporte-dato pasaporte-dato--ruta"><span aria-hidden="true">⭐</span> {t('pasaporteVisual.ruta', { nombre: ruta ? ruta.nombre : t('pasaporteVisual.sinRuta') })}</span>
            </div>

            {personales.length > 0 && <p className="pasaporte-personal">{personales.join(' · ')}</p>}

            {Array.from({ length: MAX_SELLOS }, (_, i) => {
              const sello = mostrados[i];
              if (!sello) {
                return (
                  <div key={`vacio-${i}`} className={`pasaporte-sello pasaporte-sello--vacio pasaporte-sello--${i}`}>
                    <svg className="pasaporte-candado" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  </div>
                );
              }
              const sitio = sitiosPorId[sello.sitioId];
              return (
                <div key={sello.id ?? sello.sitioId} className={`pasaporte-sello pasaporte-sello--${i}`} title={sitio.name}>
                  <img className="pasaporte-sello-insignia" src={INSIGNIAS[sitio.badge]} alt={sitio.name} />
                  <span className="pasaporte-sello-marca" aria-hidden="true"><span>{t('pasaporteVisual.sellado')}</span></span>
                </div>
              );
            })}

            {resto > 0 && <span className="pasaporte-mas">{t('pasaporteVisual.mas', { n: resto })}</span>}
          </div>

          {enPortada && (
            <>
              <div className={`oc-anillas pasaporte-anillas ${fase === 'abriendo' ? 'pasaporte-anillas--fuera' : ''}`} aria-hidden="true">
                {Array.from({ length: 11 }, (_, i) => <i key={i} />)}
              </div>
              <button type="button" className={`oc-hoja oc-tapa pasaporte-tapa ${fase === 'abriendo' ? 'oc-volteada' : ''}`} onClick={() => setFase('abriendo')} aria-label={t('pasaporteVisual.abrir')}>
                <div className="oc-tapa-interior">
                  <img className="oc-tapa-w" src={logoW} alt="" />
                  <img className="oc-tapa-nombre" src={logoNombre} alt="WhereGüense" />
                  <p className="oc-tapa-rep">República de</p>
                  <div className="oc-tapa-pais">NICARAGUA</div>
                  <div className="oc-tapa-linea" />
                </div>
                <div className="oc-tapa-anio">2026</div>
              </button>
            </>
          )}
        </div>
      )}
    </div>,
    document.body,
  );
}

export default PasaporteVisual;
