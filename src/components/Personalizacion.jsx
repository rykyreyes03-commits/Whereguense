import { useState } from 'react';
import './Personalizacion.css';
import TopBar from './TopBar';
import Avatar from './Avatar';
import { sellosParaSiguienteNivel } from '../utils/rango';
import {
  ROSTROS, ROPAS, SOMBREROS, GIGANTONA,
  ROSTROS_IDS, ROPAS_IDS, SOMBREROS_IDS, GIGANTONA_IDS,
} from '../data/avatarPiezas';

function Personalizacion({ sellos, onNavigate, desbloqueados, seleccion, elegir, nivel }) {
  const tipoAvatar = localStorage.getItem('avatarElegido') === 'gigantona' ? 'gigantona' : 'enano';
  const [tab, setTab] = useState('ropa');
  const faltantes = Math.max(0, sellosParaSiguienteNivel(sellos.length) - sellos.length);

  const catalogos = {
    rostro: { pool: ROSTROS, ids: ROSTROS_IDS },
    ropa: { pool: ROPAS, ids: ROPAS_IDS },
    sombrero: { pool: SOMBREROS, ids: SOMBREROS_IDS },
    gigantona: { pool: GIGANTONA, ids: GIGANTONA_IDS },
  };

  const renderGrid = (categoria) => {
    const { pool, ids } = catalogos[categoria];
    const desbloqueadosCategoria = desbloqueados[categoria] || [];

    return (
      <div className="personalizacion-grid">
        {categoria === 'sombrero' && (
          <button
            className={`personalizacion-item ${!seleccion.sombrero ? 'seleccionado' : ''}`}
            onClick={() => elegir('sombrero', null)}
          >
            <span className="personalizacion-sin-sombrero">Sin sombrero</span>
          </button>
        )}

        {ids.map((id) => {
          const desbloqueado = desbloqueadosCategoria.includes(id);
          const seleccionado = seleccion[categoria] === id;

          return (
            <button
              key={id}
              className={`personalizacion-item ${seleccionado ? 'seleccionado' : ''} ${!desbloqueado ? 'bloqueado' : ''}`}
              onClick={() => desbloqueado && elegir(categoria, id)}
              disabled={!desbloqueado}
            >
              <img src={pool[id]} alt={desbloqueado ? id : 'Bloqueado'} />
              {!desbloqueado && <span className="personalizacion-candado">🔒</span>}
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <div className="personalizacion-wrapper">
      <TopBar onBack={() => onNavigate?.('perfil')} title="Personaliza tu avatar" />

      <div className="personalizacion-contenido">
        <Avatar tipo={tipoAvatar} seleccion={seleccion} tamano="grande" />

        <p className="personalizacion-nivel">
          Nivel {nivel} · te faltan {faltantes} sello{faltantes === 1 ? '' : 's'} para subir de nivel
        </p>

        {tipoAvatar === 'gigantona' ? (
          renderGrid('gigantona')
        ) : (
          <>
            <div className="personalizacion-tabs">
              <button className={tab === 'sombrero' ? 'activo' : ''} onClick={() => setTab('sombrero')}>Sombrero</button>
              <button className={tab === 'ropa' ? 'activo' : ''} onClick={() => setTab('ropa')}>Ropa</button>
              <button className={tab === 'rostro' ? 'activo' : ''} onClick={() => setTab('rostro')}>Rostro</button>
            </div>
            {renderGrid(tab)}
          </>
        )}
      </div>
    </div>
  );
}

export default Personalizacion;
