import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { cambiarIdioma } from '../i18n';
import './Perfil.css';
import TopBar from './TopBar';
import cabezonImg from '../assets/flujo-inicial/explorer_transparente_final.png';
import gigantonaImg from '../assets/flujo-inicial/gigantona.png';
import { obtenerRango } from '../utils/rango';

const PERFIL_POR_DEFECTO = {
  nombre: 'Invitado',
  pais: '',
  idioma: 'es',
};

const IDIOMAS = { es: 'Español', en: 'English' };

function perfilDesdeUsuario(usuarioActual) {
  return {
    nombre: usuarioActual.nombre_usuario || 'Invitado',
    pais: usuarioActual.pais || '',
    idioma: usuarioActual.idioma_preferido || 'es',
  };
}

function cargarPerfil() {
  try {
    const guardado = JSON.parse(localStorage.getItem('perfilUsuario'));
    if (guardado && typeof guardado === 'object') {
      return { ...PERFIL_POR_DEFECTO, ...guardado };
    }
  } catch (error) {
    console.error('Error leyendo perfil guardado:', error);
  }
  return PERFIL_POR_DEFECTO;
}

function cargarAvatar() {
  try {
    return localStorage.getItem('avatarElegido') === 'gigantona' ? 'gigantona' : 'enano';
  } catch (error) {
    console.error('Error leyendo avatar elegido:', error);
    return 'enano';
  }
}

function cargarFoto() {
  try {
    return localStorage.getItem('fotoPerfil') || null;
  } catch (error) {
    console.error('Error leyendo foto de perfil:', error);
    return null;
  }
}

const FOTO_MAX_PX = 256;

function redimensionarImagen(file) {
  return new Promise((resolve, reject) => {
    const lector = new FileReader();
    lector.onerror = () => reject(new Error('No se pudo leer el archivo.'));
    lector.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('El archivo no es una imagen válida.'));
      img.onload = () => {
        const escala = Math.min(1, FOTO_MAX_PX / Math.max(img.width, img.height));
        const w = Math.round(img.width * escala);
        const h = Math.round(img.height * escala);
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.src = lector.result;
    };
    lector.readAsDataURL(file);
  });
}

function Perfil({ sellos, total, onNavigate, onVolver, onCerrarSesion, usuarioActual, onActualizarPerfil, modoNegocio = false }) {
  const { t } = useTranslation();
  const [perfil, setPerfil] = useState(() =>
    usuarioActual ? perfilDesdeUsuario(usuarioActual) : cargarPerfil()
  );
  const [guardandoPerfil, setGuardandoPerfil] = useState(false);
  const [editando, setEditando] = useState(false);

  useEffect(() => {
    if (usuarioActual) {
      setPerfil(perfilDesdeUsuario(usuarioActual));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuarioActual?.nombre_usuario, usuarioActual?.pais, usuarioActual?.idioma_preferido]);
  const [borrador, setBorrador] = useState(perfil);
  const [fotoPerfil, setFotoPerfil] = useState(cargarFoto);
  const inputFotoRef = useRef(null);

  const nivel = obtenerRango(sellos.length);
  const avatarTipo = cargarAvatar();
  const avatarImg = avatarTipo === 'gigantona' ? gigantonaImg : cabezonImg;
  const avatarNombre = avatarTipo === 'gigantona' ? 'Gigantona' : 'Cabezón';

  const handleEditar = () => {
    setBorrador(perfil);
    setEditando(true);
  };

  const handleGuardar = async () => {
    if (usuarioActual && onActualizarPerfil) {
      setGuardandoPerfil(true);
      const resultado = await onActualizarPerfil(borrador);
      setGuardandoPerfil(false);
      if (!resultado?.exito) {
        window.alert(resultado?.mensaje || t('perfil.errorGuardar'));
        return;
      }
    } else {
      try {
        localStorage.setItem('perfilUsuario', JSON.stringify(borrador));
      } catch (error) {
        console.error('Error guardando perfil:', error);
      }
    }
    // El idioma elegido se aplica a toda la app en cuanto el perfil se guarda (y queda en este dispositivo).
    cambiarIdioma(borrador.idioma);
    setPerfil(borrador);
    setEditando(false);
  };

  const handleElegirFoto = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const dataUrl = await redimensionarImagen(file);
      setFotoPerfil(dataUrl);
      try {
        localStorage.setItem('fotoPerfil', dataUrl);
      } catch (err) {
        console.error('Error guardando foto de perfil:', err);
      }
    } catch (err) {
      console.error(err);
      window.alert(t('perfil.errorImagen'));
    }
  };

  const handleQuitarFoto = () => {
    setFotoPerfil(null);
    try {
      localStorage.removeItem('fotoPerfil');
    } catch (err) {
      console.error('Error quitando foto de perfil:', err);
    }
  };

  const handleCerrarSesion = () => {
    const confirmado = window.confirm(t('perfil.confirmarCerrar'));
    if (!confirmado) return;

    onCerrarSesion?.();
  };

  return (
    <div className="perfil-wrapper">
      <TopBar align="center" onBack={() => (onVolver ? onVolver() : onNavigate?.('inicio'))}>
        <button
          type="button"
          className={`perfil-avatar ${fotoPerfil ? 'perfil-avatar--foto' : ''}`}
          onClick={() => inputFotoRef.current?.click()}
          aria-label={t('perfil.fotoAria')}
        >
          <img
            src={fotoPerfil || avatarImg}
            alt={fotoPerfil ? t('perfil.fotoAlt') : t('perfil.danzanteAlt', { nombre: avatarNombre })}
          />
          <span className="perfil-avatar-camara" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none">
              <path d="M4 8.5A1.5 1.5 0 0 1 5.5 7h1.7l1-1.6A1 1 0 0 1 10 5h4a1 1 0 0 1 .85.4l1 1.6h1.65A1.5 1.5 0 0 1 20 8.5v9A1.5 1.5 0 0 1 18.5 19h-13A1.5 1.5 0 0 1 4 17.5v-9Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
              <circle cx="12" cy="12.5" r="3" stroke="currentColor" strokeWidth="1.8" />
            </svg>
          </span>
        </button>
        <input
          ref={inputFotoRef}
          type="file"
          accept="image/*"
          onChange={handleElegirFoto}
          className="perfil-foto-input"
        />
        <h1 className="perfil-nombre">{perfil.nombre}</h1>
        {!modoNegocio && <span className="perfil-rango">{t(`rangosUsuario.${nivel.clave}`)}</span>}
        <div className="perfil-foto-acciones">
          <button
            type="button"
            className="perfil-foto-btn"
            onClick={() => inputFotoRef.current?.click()}
          >
            {fotoPerfil ? t('perfil.cambiarFoto') : t('perfil.subirFoto')}
          </button>
          {fotoPerfil && (
            <button
              type="button"
              className="perfil-foto-btn perfil-foto-btn--quitar"
              onClick={handleQuitarFoto}
            >
              {t('perfil.quitarFoto')}
            </button>
          )}
        </div>
        {!modoNegocio && <span className="perfil-danzante">{t('perfil.danzante', { nombre: avatarNombre })}</span>}
      </TopBar>

      <div className="perfil-contenido">
        <div className="perfil-card perfil-datos">
          <div className="perfil-datos-titulo">
            <h2 className="perfil-seccion">{t('perfil.datos')}</h2>
            {!editando && (
              <button
                className="perfil-editar-btn"
                onClick={handleEditar}
                aria-label={t('perfil.editarAria')}
              >
                {t('perfil.editar')}
              </button>
            )}
          </div>

          {!editando ? (
            <ul className="perfil-lista">
              <li>
                <span>{t('perfil.nombreUsuario')}</span>
                <strong>{perfil.nombre}</strong>
              </li>
              <li>
                <span>{t('perfil.pais')}</span>
                <strong>{perfil.pais || t('perfil.noEspecificado')}</strong>
              </li>
              <li>
                <span>{t('perfil.idioma')}</span>
                <strong>{IDIOMAS[perfil.idioma] || perfil.idioma}</strong>
              </li>
            </ul>
          ) : (
            <div className="perfil-form">
              <label>
                {t('perfil.nombreUsuario')}
                <input
                  type="text"
                  value={borrador.nombre}
                  onChange={(e) =>
                    setBorrador({ ...borrador, nombre: e.target.value })
                  }
                />
              </label>
              <label>
                {t('perfil.pais')}
                <input
                  type="text"
                  value={borrador.pais}
                  onChange={(e) =>
                    setBorrador({ ...borrador, pais: e.target.value })
                  }
                />
              </label>
              <label>
                {t('perfil.idioma')}
                <select
                  value={borrador.idioma}
                  onChange={(e) =>
                    setBorrador({ ...borrador, idioma: e.target.value })
                  }
                >
                  <option value="es">Español</option>
                  <option value="en">English</option>
                </select>
              </label>
              <button className="perfil-guardar-btn" onClick={handleGuardar} disabled={guardandoPerfil}>
                {guardandoPerfil ? t('comun.guardando') : t('comun.guardar')}
              </button>
            </div>
          )}
        </div>

        {/* Sellos y ranking son del turista: el emprendedor que abre su perfil desde el panel no los ve */}
        {!modoNegocio && (
          <>
            <div className="perfil-card perfil-sellos-resumen">
              <div>
                <h2 className="perfil-seccion">{t('perfil.sellos')}</h2>
                <p>{t('perfil.coleccion')}</p>
              </div>
              <div className="perfil-sellos-cifra">
                <strong>{sellos.length}</strong>
                <span>{t('perfil.de', { total })}</span>
              </div>
            </div>

            <div className="perfil-acciones">
              <button
                className="perfil-btn perfil-btn-primario"
                onClick={() => onNavigate?.('pasaporte')}
              >
                {t('perfil.verSellos')}
              </button>
              <button
                className="perfil-btn perfil-btn-secundario"
                onClick={() => onNavigate?.('ranking')}
              >
                {t('perfil.ranking')}
              </button>
            </div>
          </>
        )}

        <button
          className="perfil-btn perfil-btn-danger"
          onClick={handleCerrarSesion}
        >
          {t('perfil.cerrarSesion')}
        </button>
      </div>
    </div>
  );
}

export default Perfil;
