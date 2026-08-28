import { useState } from 'react';
import './Perfil.css';
import TopBar from './TopBar';
import BottomNav from './BottomNav';
import iconoUsuario from '../assets/icons/icono_usuario.svg';
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

function Perfil({ sellos, total, onNavigate, onCerrarSesion }) {
  const [perfil, setPerfil] = useState(cargarPerfil);
  const [editando, setEditando] = useState(false);
  const [borrador, setBorrador] = useState(perfil);

  const nivel = obtenerRango(sellos.length);

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
        <div className="perfil-avatar">
          <img src={iconoUsuario} alt="Usuario" />
        </div>
        <h1 className="perfil-nombre">{perfil.nombre}</h1>
        <span
          className="perfil-rango"
          style={{ color: nivel.color, borderColor: nivel.color }}
        >
          {nivel.nombre}
        </span>
      </TopBar>

      <div className="perfil-contenido">
        <div className="perfil-datos">
          <div className="perfil-datos-titulo">
            <h2 className="seccion">DATOS DE USUARIO</h2>
            {!editando && (
              <button
                className="perfil-editar-btn"
                onClick={handleEditar}
                aria-label="Editar perfil"
              >
                ✏️
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

        <div className="perfil-sellos-resumen">
          <h2 className="seccion">SELLOS</h2>
          <p>
            {sellos.length} de {total} obtenidos
          </p>
        </div>

        <div className="perfil-acciones">
          <button
            className="perfil-nav-btn"
            onClick={() => onNavigate?.('pasaporte')}
          >
            Ver mis sellos
          </button>
          <button
            className="perfil-nav-btn"
            onClick={() => onNavigate?.('ranking')}
          >
            Ranking
          </button>
        </div>

        <button className="perfil-logout-btn" onClick={handleCerrarSesion}>
          Cerrar sesión
        </button>
      </div>

      <BottomNav activo="perfil" onNavigate={onNavigate} />
    </div>
  );
}

export default Perfil;