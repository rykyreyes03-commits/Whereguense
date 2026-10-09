import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Edit2, Lock, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import './OnboardingCuaderno.css';
import './PasaporteVisual.css';
import logoW from '../assets/cuaderno_w.png';
import logoNombre from '../assets/cuaderno_nombre.png';
// Los mismos personajes del perfil, recortados a su contenido
import cabezonImg from '../assets/pasaporte_avatar_cabezon.webp';
import gigantonaImg from '../assets/pasaporte_avatar_gigantona.webp';
import PasaporteEdicion from './PasaporteEdicion';
import { INSIGNIAS } from '../data/insignias';
import { rutaFavorita, numeroDePasaporte } from '../utils/pasaporte';

const MAX_SELLOS = 6;
const ANILLAS = Array.from({ length: 11 }, (_, i) => i);

// Lo que guarda el navegador: la foto de perfil (si subió una) y el personaje que eligió al registrarse.
function leerLocal(clave) {
  try {
    return localStorage.getItem(clave) || null;
  } catch {
    return null;
  }
}

// El pasaporte de viajero como un cuaderno: portada que se abre al tocarla, la página de datos del viajero y la de sus sellos.
//   usuario: { id, nombre_usuario, pais, avatar_personaje, foto_perfil_url, fecha_nacimiento, telefono, genero, idioma_preferido },
//   sellos: los del usuario, sitios: todos, rutas: [{ nombre, sitios }], nivel: número.
//   onGuardarPerfil(datos) -> Promise<boolean>: si viene (y hay usuario), aparece el lápiz para editar la información.
function PasaporteVisual({ usuario, sellos, sitios, rutas, nivel = 1, onGuardarPerfil = null, guardando = false, error = null, onCerrar }) {
  const { t, i18n } = useTranslation();
  const cerrarRef = useRef(null);
  const libroRef = useRef(null);
  const primeraVez = useRef(true);
  const accionRef = useRef(onCerrar);
  useEffect(() => { accionRef.current = onCerrar; });
  const [pagina, setPagina] = useState(0); // 0 portada, 1 datos, 2 sellos
  const [editando, setEditando] = useState(false);

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

  // Al voltear una página, el foco pasa a su título
  useEffect(() => {
    if (primeraVez.current) { primeraVez.current = false; return undefined; }
    const id = setTimeout(() => libroRef.current?.querySelector('.oc-hoja:not([inert]) [data-foco]')?.focus(), 500);
    return () => clearTimeout(id);
  }, [pagina]);

  const nombre = usuario?.nombre_usuario || t('pasaporteVisual.invitado');
  const personaje = usuario?.avatar_personaje || leerLocal('avatarElegido');
  const avatar = String(personaje || '').includes('gigantona') ? gigantonaImg : cabezonImg;
  const fotoPerfil = usuario?.foto_perfil_url || leerLocal('fotoPerfil');
  const ruta = rutaFavorita(rutas, sellos);

  const sitiosPorId = Object.fromEntries(sitios.map((s) => [s.id, s]));
  const deSitio = sellos.filter((s) => s.sitioId != null && sitiosPorId[s.sitioId]);
  const mostrados = deSitio.slice(0, MAX_SELLOS);
  const resto = Math.max(0, deSitio.length - MAX_SELLOS);

  let nacimiento = null;
  if (usuario?.fecha_nacimiento) {
    const [a, m, d] = usuario.fecha_nacimiento.split('-').map(Number);
    nacimiento = new Date(a, m - 1, d).toLocaleDateString(i18n.language, { day: 'numeric', month: 'short', year: 'numeric' });
  }
  const idioma = usuario?.idioma_preferido ? t(`pasaporteVisual.idiomas.${usuario.idioma_preferido}`, { defaultValue: usuario.idioma_preferido }) : null;
  const genero = usuario?.genero ? t(`pasaporteVisual.generos.${usuario.genero}`) : null;
  const filas = [
    { clave: 'nacimiento', icono: '🗓️', etiqueta: t('pasaporteVisual.fNacimiento'), valor: nacimiento },
    { clave: 'telefono', icono: '📱', etiqueta: t('pasaporteVisual.fTelefono'), valor: usuario?.telefono },
    { clave: 'idioma', icono: '🌍', etiqueta: t('pasaporteVisual.fIdioma'), valor: idioma },
    { clave: 'genero', icono: '⚥', etiqueta: t('pasaporteVisual.fGenero'), valor: genero },
  ];
  const stats = [
    { clave: 'nivel', icono: '🌟', etiqueta: t('pasaporteVisual.sNivel'), valor: String(nivel) },
    { clave: 'sellos', icono: '🎖️', etiqueta: t('pasaporteVisual.sSellos'), valor: t('pasaporteVisual.sSellosValor', { n: deSitio.length, total: sitios.length }) },
    { clave: 'ruta', icono: '⭐', etiqueta: t('pasaporteVisual.sRuta'), valor: ruta ? ruta.nombre : t('pasaporteVisual.sinRuta') },
  ];

  const puedeEditar = Boolean(usuario && onGuardarPerfil);
  const hoja = (i, extra = '') => `oc-hoja ${extra} ${i < pagina ? 'oc-volteada' : ''}`;
  const inactiva = (i) => (i === pagina ? {} : { inert: true, 'aria-hidden': true });

  return createPortal(
    <div className="pasaporte-fondo" onClick={(e) => { if (e.target === e.currentTarget) onCerrar(); }}>
      <button ref={cerrarRef} type="button" className="pasaporte-cerrar" onClick={onCerrar} aria-label={t('pasaporteVisual.cerrar')}>
        <X size={24} strokeWidth={2.4} aria-hidden="true" />
      </button>

      {editando ? (
        <PasaporteEdicion
          usuario={usuario}
          vistaPrevia={fotoPerfil || avatar}
          guardando={guardando}
          error={error}
          onGuardar={onGuardarPerfil}
          onCancelar={() => setEditando(false)}
        />
      ) : (
        <main className="oc-vars oc-libro pasaporte-libro" ref={libroRef} role="dialog" aria-modal="true" aria-label={t('pasaporteVisual.aria', { nombre })}>
          <div className="oc-anillas" aria-hidden="true">{ANILLAS.map((i) => <i key={i} />)}</div>

          {/* Portada */}
          <button type="button" className={hoja(0, 'oc-tapa')} style={{ zIndex: 5 }} onClick={() => setPagina(1)} aria-label={t('pasaporteVisual.abrir')} {...inactiva(0)}>
            <div className="oc-tapa-interior">
              <img className="oc-tapa-w" src={logoW} alt="" />
              <img className="oc-tapa-nombre" src={logoNombre} alt="WhereGüense" />
              <p className="oc-tapa-rep">República de</p>
              <div className="oc-tapa-pais">NICARAGUA</div>
              <div className="oc-tapa-linea" />
            </div>
            <div className="oc-tapa-anio">2026</div>
            <div className="oc-tapa-toca">{t('pasaporteVisual.toca')}</div>
          </button>

          {/* Página 1: datos del viajero */}
          <section className={hoja(1, 'oc-papel')} style={{ zIndex: 4 }} {...inactiva(1)}>
            <div className="oc-contenido pv-pagina">
              {puedeEditar && (
                <button type="button" className="pasaporte-editar" onClick={() => setEditando(true)} aria-label={t('pasaporteVisual.editar')} title={t('pasaporteVisual.editar')}>
                  <Edit2 size={18} strokeWidth={2.2} aria-hidden="true" />
                </button>
              )}

              <div className="pv-viajero">
                <span className="pv-foto">
                  {fotoPerfil
                    ? <img className="pv-foto-img pv-foto-img--perfil" src={fotoPerfil} alt={t('perfil.fotoAlt')} />
                    : <img className="pv-foto-img" src={avatar} alt="" />}
                </span>
                <div className="pv-viajero-datos">
                  <h1 className="pv-nombre" tabIndex={-1} data-foco>{nombre}</h1>
                  <span className="pv-pais">{usuario?.pais || '—'}</span>
                  <span className="pv-numero" aria-label={t('pasaporteVisual.numero', { n: numeroDePasaporte(usuario?.id) })}>{numeroDePasaporte(usuario?.id)}</span>
                </div>
              </div>

              <p className="oc-grupo">{t('pasaporteVisual.datosTitulo')}</p>
              <dl className="pv-filas">
                {filas.map((f) => (
                  <div key={f.clave} className={`pv-fila pv-fila--${f.clave}`}>
                    <dt><span aria-hidden="true">{f.icono}</span> {f.etiqueta}</dt>
                    <dd className={f.valor ? '' : 'pv-vacio'}>{f.valor || '—'}</dd>
                  </div>
                ))}
              </dl>

              <p className="oc-grupo">{t('pasaporteVisual.estadisticasTitulo')}</p>
              <dl className="pv-filas">
                {stats.map((f) => (
                  <div key={f.clave} className={`pv-fila pv-fila--${f.clave}`}>
                    <dt><span aria-hidden="true">{f.icono}</span> {f.etiqueta}</dt>
                    <dd>{f.valor}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <button type="button" className="oc-atras" onClick={() => setPagina(0)}>{t('pasaporteVisual.portada')}</button>
            <button type="button" className="pv-siguiente" onClick={() => setPagina(2)}>{t('pasaporteVisual.verSellos')}</button>
            <span className="oc-pagina">1 / 2</span>
          </section>

          {/* Página 2: sellos */}
          <section className={hoja(2, 'oc-papel')} style={{ zIndex: 3 }} {...inactiva(2)}>
            <div className="oc-contenido pv-pagina">
              <h1 className="oc-titulo-sello" tabIndex={-1} data-foco>{t('pasaporteVisual.sellosTitulo')}</h1>
              <ul className="pv-sellos">
                {Array.from({ length: MAX_SELLOS }, (_, i) => {
                  const sello = mostrados[i];
                  if (!sello) {
                    return (
                      <li key={`vacio-${i}`} className="pv-sello pv-sello--vacio">
                        <Lock className="pv-candado" strokeWidth={2.2} aria-hidden="true" />
                      </li>
                    );
                  }
                  const sitio = sitiosPorId[sello.sitioId];
                  return (
                    <li key={sello.id ?? sello.sitioId} className="pv-sello" title={sitio.name}>
                      <img className="pv-sello-insignia" src={INSIGNIAS[sitio.badge]} alt={sitio.name} />
                      <span className="pv-sello-marca" aria-hidden="true"><span>{t('pasaporteVisual.sellado')}</span></span>
                    </li>
                  );
                })}
              </ul>
              {resto > 0 && <p className="pv-mas">{t('pasaporteVisual.mas', { n: resto })}</p>}
            </div>
            <button type="button" className="oc-atras" onClick={() => setPagina(1)}>{t('pasaporteVisual.verDatos')}</button>
            <span className="oc-pagina">2 / 2</span>
          </section>
        </main>
      )}
    </div>,
    document.body,
  );
}

export default PasaporteVisual;
