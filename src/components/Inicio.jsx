import './Inicio.css';
import TopBar from './TopBar';
import BottomNav from './BottomNav';
import iconoUsuario from '../assets/icons/icono_usuario.svg';
import iconoBuscar from '../assets/icons/icono_buscar.svg';
import iconoArbol from '../assets/icons/icono_arbol.svg';
import iconoRuta from '../assets/icons/icono_ruta.svg';
import iconoRutaGuardada from '../assets/icons/icono_ruta_guardada.svg';
import iconoTema from '../assets/icons/icono_tema.svg';

function Inicio({ onNavigate, onSeleccionarRuta, totalSitios, onSeleccionarEvento, eventoDestacadoId }) {
  return (
    <div className="inicio-wrapper">

      <TopBar
        rightSlot={
          <div className="avatar">
            <img src={iconoUsuario} alt="Usuario" />
          </div>
        }
      />

      <div className="contenido">
        <h1 className="bienvenida">¡Bienvenido, Invitado!</h1>
        <p className="subtitulo">¿Qué quieres descubrir hoy?</p>

        <div className="buscador">
          <img src={iconoBuscar} alt="Buscar" />
          <input type="text" placeholder="Buscar rutas, sitios..." />
        </div>

        <h2 className="seccion">ACCESOS RÁPIDOS</h2>
        <div className="accesos-rapidos">
          <div className="acceso activo">
            <div className="circulo"><img src={iconoArbol} alt="Último sello" /></div>
            <span>Último<br/>sello</span>
          </div>
          <div className="acceso plain">
            <div className="circulo"><img src={iconoRuta} alt="Última ruta" /></div>
            <span>Última<br/>ruta</span>
          </div>
          <div className="acceso plain">
            <div className="circulo"><img src={iconoRutaGuardada} alt="Ruta guardada" /></div>
            <span>Ruta<br/>guardada</span>
          </div>
          <div className="acceso plain">
            <div className="circulo"><img src={iconoTema} alt="Tema" /></div>
            <span>Tema</span>
          </div>
        </div>

        <div className="seccion-header">
          <h2 className="seccion">RUTAS DESTACADAS</h2>
          <span className="ver-todas" onClick={() => onNavigate?.('rutas')}>ver todas</span>
        </div>
        <div className="card-wrap">
          <div
            className="card"
            onClick={() => { onSeleccionarRuta?.(1); onNavigate?.('detalleRuta'); }}
            role="button"
            tabIndex={0}
          >
            <div className="card-img placeholder-a"></div>
            <div className="card-info">
              <div className="barcode"></div>
              <div className="guia">GUÍA:<br/>Invitado</div>
              <h3>Ruta Dariana</h3>
              <div className="ubicacion">LEÓN, NICARAGUA</div>
              <div className="pill">{totalSitios} sitios</div>
            </div>
          </div>
        </div>

        <h2 className="seccion">EVENTOS DE ESTA SEMANA</h2>
        <div className="card-wrap">
          <div
            className="card destacada"
            onClick={eventoDestacadoId ? () => { onSeleccionarEvento?.(eventoDestacadoId); onNavigate?.('detalleEvento'); } : undefined}
            role={eventoDestacadoId ? 'button' : undefined}
            tabIndex={eventoDestacadoId ? 0 : undefined}
          >
            <div className="card-img placeholder-b"></div>
            <div className="card-info">
              <div className="barcode"></div>
              <div className="guia">GUÍA:<br/>Invitado</div>
              <h3>Festival Dariano</h3>
              <div className="ubicacion">LEÓN, NICARAGUA</div>
              <div className="pill">4 sitios</div>
            </div>
          </div>
        </div>
      </div>

      <BottomNav activo="inicio" onNavigate={onNavigate} />

    </div>
  );
}

export default Inicio;