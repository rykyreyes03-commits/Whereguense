import { useState } from 'react';
import './Inicio.css';
import TopBar from './TopBar';
import BottomNav from './BottomNav';
import { useRutasGuardadas } from '../hooks/useRutasGuardadas';
import iconoUsuario from '../assets/icons/icono_usuario.svg';
import iconoBuscar from '../assets/icons/icono_buscar.svg';
import iconoArbol from '../assets/icons/icono_arbol.svg';
import iconoRuta from '../assets/icons/icono_ruta.svg';
import iconoRutaGuardada from '../assets/icons/icono_ruta_guardada.svg';
import iconoTema from '../assets/icons/icono_tema.svg';

function Inicio({
  sitios,
  rutas,
  sellos,
  onNavigate,
  onSeleccionarRuta,
  onSeleccionarSitio,
  onVerSitioEnMapa,
  onSeleccionarEvento,
  eventoDestacadoId,
}) {
  const [busqueda, setBusqueda] = useState('');
  const { guardadas } = useRutasGuardadas();

  const query = busqueda.trim().toLowerCase();
  const buscando = query.length > 0;
  const rutasCoincidentes = buscando ? rutas.filter((r) => r.nombre.toLowerCase().includes(query)) : [];
  const sitiosCoincidentes = buscando ? sitios.filter((s) => s.name.toLowerCase().includes(query)) : [];
  const sinResultados = buscando && rutasCoincidentes.length === 0 && sitiosCoincidentes.length === 0;

  const ultimoSello = sellos.length > 0 ? sellos[sellos.length - 1] : null;
  const rutaPrincipal = rutas[0];
  const rutaGuardada = rutas.find((r) => guardadas.includes(r.id));

  const handleUltimoSello = () => {
    if (!ultimoSello) {
      window.alert('Todavía no tenés ningún sello — ¡visitá un sitio en el mapa!');
      return;
    }
    onSeleccionarSitio?.(ultimoSello.sitioId);
    onNavigate?.('detalleSello');
  };

  const handleUltimaRuta = () => {
    if (!rutaPrincipal) return;
    onSeleccionarRuta?.(rutaPrincipal.id);
    onNavigate?.('detalleRuta');
  };

  const handleRutaGuardada = () => {
    if (!rutaGuardada) {
      window.alert('Todavía no guardaste ninguna ruta — entrá a una ruta y tocá la estrella para guardarla.');
      return;
    }
    onSeleccionarRuta?.(rutaGuardada.id);
    onNavigate?.('detalleRuta');
  };

  const handleTema = () => {
    window.alert('Tema oscuro: próximamente 🚧');
  };

  const irARuta = (rutaId) => {
    onSeleccionarRuta?.(rutaId);
    onNavigate?.('detalleRuta');
  };

  return (
    <div className="inicio-wrapper">

      <TopBar
        onMenuClick={() => onNavigate?.('menu')}
        rightSlot={
          <div className="avatar" onClick={() => onNavigate?.('personalizacion')} role="button" tabIndex={0}>
            <img src={iconoUsuario} alt="Personalizar avatar" />
          </div>
        }
      />

      <div className="contenido">
        <h1 className="bienvenida">¡Bienvenido, Invitado!</h1>
        <p className="subtitulo">¿Qué quieres descubrir hoy?</p>

        <div className="buscador">
          <img src={iconoBuscar} alt="Buscar" />
          <input
            type="text"
            placeholder="Buscar rutas, sitios..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>

        {buscando && (
          <div className="resultados-busqueda">
            {rutasCoincidentes.map((r) => (
              <div key={`ruta-${r.id}`} className="resultado-item" onClick={() => irARuta(r.id)}>
                <span>{r.nombre}</span>
                <span className="resultado-tipo">Ruta</span>
              </div>
            ))}
            {sitiosCoincidentes.map((s) => (
              <div key={`sitio-${s.id}`} className="resultado-item" onClick={() => onVerSitioEnMapa?.(s.id)}>
                <span>{s.name}</span>
                <span className="resultado-tipo">Sitio</span>
              </div>
            ))}
            {sinResultados && (
              <div className="resultado-vacio">Sin resultados para "{busqueda}"</div>
            )}
          </div>
        )}

        <h2 className="seccion">ACCESOS RÁPIDOS</h2>
        <div className="accesos-rapidos">
          <div className={`acceso ${ultimoSello ? 'activo' : 'plain'}`} onClick={handleUltimoSello} role="button" tabIndex={0}>
            <div className="circulo"><img src={iconoArbol} alt="Último sello" /></div>
            <span>Último<br/>sello</span>
          </div>
          <div className="acceso plain" onClick={handleUltimaRuta} role="button" tabIndex={0}>
            <div className="circulo"><img src={iconoRuta} alt="Última ruta" /></div>
            <span>Última<br/>ruta</span>
          </div>
          <div className={`acceso plain ${!rutaGuardada ? 'deshabilitado' : ''}`} onClick={handleRutaGuardada} role="button" tabIndex={0}>
            <div className="circulo"><img src={iconoRutaGuardada} alt="Ruta guardada" /></div>
            <span>Ruta<br/>guardada</span>
          </div>
          <div className="acceso plain" onClick={handleTema} role="button" tabIndex={0}>
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
            onClick={() => { onSeleccionarRuta?.(rutaPrincipal.id); onNavigate?.('detalleRuta'); }}
            role="button"
            tabIndex={0}
          >
            <div className="card-img placeholder-a"></div>
            <div className="card-info">
              <div className="barcode"></div>
              <div className="guia">GUÍA:<br/>Invitado</div>
              <h3>{rutaPrincipal.nombre}</h3>
              <div className="ubicacion">{rutaPrincipal.ciudad.toUpperCase()}</div>
              <div className="pill">{sitios.length} sitios</div>
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