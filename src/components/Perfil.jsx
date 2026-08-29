import { useRef, useState } from 'react';
import './Perfil.css';
import TopBar from './TopBar';
import BottomNav from './BottomNav';
import cabezonImg from '../assets/flujo-inicial/explorer_transparente_final.png';
import gigantonaImg from '../assets/flujo-inicial/gigantona.png';
import { obtenerRango } from '../utils/rango';

const PERFIL_POR_DEFECTO = {
  nombre: 'Invitado',
  pais: '',
  idioma: 'Español',
};

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

function Perfil({ sellos, total, onNavigate, onCerrarSesion }) {
  const [perfil, setPerfil] = useState(cargarPerfil);
  const [editando, setEditando] = useState(false);
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

  const handleGuardar = () => {
    setPerfil(borrador);
    try {
      localStorage.setItem('perfilUsuario', JSON.stringify(borrador));
    } catch (error) {
      console.error('Error guardando perfil:', error);
    }
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
      window.alert('No se pudo usar esa imagen. Prueba con otra foto.');
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
    const confirmado = window.confirm(
      '¿Seguro que quieres cerrar sesión? Se borrarán tus sellos y datos de perfil guardados en este dispositivo.'
    );
    if (!confirmado) return;

    onCerrarSesion?.();
  };

  return (
    <div className="perfil-wrapper">
      <TopBar align="center" onMenuClick={() => onNavigate?.('menu')}>
        <button
          type="button"
          className={`perfil-avatar ${fotoPerfil ? 'perfil-avatar--foto' : ''}`}
          onClick={() => inputFotoRef.current?.click()}
          aria-label="Cambiar foto de perfil"
        >
          <img
            src={fotoPerfil || avatarImg}
            alt={fotoPerfil ? 'Tu foto de perfil' : `Tu danzante: ${avatarNombre}`}
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
        <span className="perfil-rango">{nivel.nombre}</span>
        <div className="perfil-foto-acciones">
          <button
            type="button"
            className="perfil-foto-btn"
            onClick={() => inputFotoRef.current?.click()}
          >
            {fotoPerfil ? 'Cambiar foto' : 'Subir foto'}
          </button>
          {fotoPerfil && (
            <button
              type="button"
              className="perfil-foto-btn perfil-foto-btn--quitar"
              onClick={handleQuitarFoto}
            >
              Quitar foto
            </button>
          )}
        </div>
        <span className="perfil-danzante">Danzante · {avatarNombre}</span>
      </TopBar>

      <div className="perfil-contenido">
        <div className="perfil-card perfil-datos">
          <div className="perfil-datos-titulo">
            <h2 className="perfil-seccion">Datos de usuario</h2>
            {!editando && (
              <button
                className="perfil-editar-btn"
                onClick={handleEditar}
                aria-label="Editar perfil"
              >
                Editar
              </button>
            )}
          </div>

          {!editando ? (
            <ul className="perfil-lista">
              <li>
                <span>Nombre de usuario</span>
                <strong>{perfil.nombre}</strong>
              </li>
              <li>
                <span>País</span>
                <strong>{perfil.pais || 'No especificado'}</strong>
              </li>
              <li>
                <span>Idioma preferido</span>
                <strong>{perfil.idioma}</strong>
              </li>
            </ul>
          ) : (
            <div className="perfil-form">
              <label>
                Nombre de usuario
                <input
                  type="text"
                  value={borrador.nombre}
                  onChange={(e) =>
                    setBorrador({ ...borrador, nombre: e.target.value })
                  }
                />
              </label>
              <label>
                País
                <input
                  type="text"
                  value={borrador.pais}
                  onChange={(e) =>
                    setBorrador({ ...borrador, pais: e.target.value })
                  }
                />
              </label>
              <label>
                Idioma preferido
                <input
                  type="text"
                  value={borrador.idioma}
                  onChange={(e) =>
                    setBorrador({ ...borrador, idioma: e.target.value })
                  }
                />
              </label>
              <button className="perfil-guardar-btn" onClick={handleGuardar}>
                Guardar
              </button>
            </div>
          )}
        </div>

        <div className="perfil-card perfil-sellos-resumen">
          <div>
            <h2 className="perfil-seccion">Sellos</h2>
            <p>Tu colección de la ruta cultural</p>
          </div>
          <div className="perfil-sellos-cifra">
            <strong>{sellos.length}</strong>
            <span>de {total}</span>
          </div>
        </div>

        <div className="perfil-acciones">
          <button
            className="perfil-btn perfil-btn-primario"
            onClick={() => onNavigate?.('pasaporte')}
          >
            Ver mis sellos
          </button>
          <button
            className="perfil-btn perfil-btn-secundario"
            onClick={() => onNavigate?.('ranking')}
          >
            Ranking
          </button>
        </div>

        <button
          className="perfil-btn perfil-btn-danger"
          onClick={handleCerrarSesion}
        >
          Cerrar sesión
        </button>
      </div>

      <BottomNav activo="perfil" onNavigate={onNavigate} />
    </div>
  );
}

export default Perfil;
