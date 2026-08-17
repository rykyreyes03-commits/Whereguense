import { useState } from 'react';
import './Ranking.css';
import { usuariosMock } from '../data/usuariosMock';
import { obtenerRango } from '../utils/rango';

const FILTROS = [
  { clave: 'semana', etiqueta: 'Esta semana', campo: 'sellosSemana' },
  { clave: 'mes', etiqueta: 'Este mes', campo: 'sellosMes' },
  { clave: 'general', etiqueta: 'General', campo: 'sellosGeneral' },
];

const MEDALLAS = ['🥇', '🥈', '🥉'];

function inicioDeSemana() {
  const hoy = new Date();
  const diaSemana = hoy.getDay();
  const diff = diaSemana === 0 ? 6 : diaSemana - 1;
  const inicio = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - diff);
  return inicio.getTime();
}

function inicioDeMes() {
  const hoy = new Date();
  return new Date(hoy.getFullYear(), hoy.getMonth(), 1).getTime();
}

function nombrePerfilActual() {
  try {
    const guardado = JSON.parse(localStorage.getItem('perfilUsuario'));
    if (guardado && typeof guardado === 'object' && guardado.nombre) {
      return guardado.nombre;
    }
  } catch (error) {
    console.error('Error leyendo perfil guardado:', error);
  }
  return 'Invitado';
}

function Ranking({ sellos, onNavigate }) {
  const [filtroActivo, setFiltroActivo] = useState('semana');

  const desdeSemana = inicioDeSemana();
  const desdeMes = inicioDeMes();

  const usuarioActual = {
    id: 'actual',
    nombreUsuario: nombrePerfilActual(),
    avatarEmoji: '🧑',
    esUsuarioActual: true,
    sellosSemana: sellos.filter(s => s.id >= desdeSemana).length,
    sellosMes: sellos.filter(s => s.id >= desdeMes).length,
    sellosGeneral: sellos.length,
  };

  const filtro = FILTROS.find(f => f.clave === filtroActivo);

  const listaOrdenada = [...usuariosMock, usuarioActual]
    .sort((a, b) => b[filtro.campo] - a[filtro.campo]);

  const nivelUsuarioActual = obtenerRango(usuarioActual.sellosGeneral);

  return (
    <div className="ranking-wrapper">
      <header className="ranking-header">
        <button className="volver-btn" onClick={() => onNavigate?.('perfil')}>
          ← Volver
        </button>
        <h1>Ranking</h1>
      </header>

      <div className="ranking-contenido">
        <div className="ranking-tabs">
          {FILTROS.map((f) => (
            <button
              key={f.clave}
              className={`ranking-tab ${filtroActivo === f.clave ? 'activo' : ''}`}
              onClick={() => setFiltroActivo(f.clave)}
            >
              {f.etiqueta}
            </button>
          ))}
        </div>

        <ul className="ranking-lista">
          {listaOrdenada.map((usuario, indice) => (
            <li
              key={usuario.id}
              className={`ranking-fila ${usuario.esUsuarioActual ? 'usuario-actual' : ''}`}
            >
              <span className="ranking-posicion">
                {MEDALLAS[indice] || `#${indice + 1}`}
              </span>
              <span className="ranking-avatar">{usuario.avatarEmoji}</span>
              <div className="ranking-info">
                <strong>{usuario.nombreUsuario}{usuario.esUsuarioActual ? ' (Tú)' : ''}</strong>
                {usuario.esUsuarioActual && (
                  <span className="ranking-rango" style={{ color: nivelUsuarioActual.color }}>
                    {nivelUsuarioActual.nombre}
                  </span>
                )}
              </div>
              <span className="ranking-sellos">{usuario[filtro.campo]} sellos</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default Ranking;
