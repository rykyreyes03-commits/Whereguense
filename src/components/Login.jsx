import './Login.css';
import ilustracionGigantona from '../assets/flujo-inicial/gigantona.png';
import iconoGoogle from '../assets/flujo-inicial/google_hd.png';
import iconoCorreo from '../assets/flujo-inicial/email_hd.png';

function Login({ onIniciarComoInvitado, onVolverALanding }) {
  const handleProximamente = (metodo) => {
    window.alert(`Continuar con ${metodo}: próximamente 🚧 (por ahora usá "Continuar como invitado")`);
  };

  return (
    <div className="login-wrapper">
      {onVolverALanding && (
        <button className="login-volver" onClick={onVolverALanding} type="button">
          ← Volver al inicio
        </button>
      )}

      <div className="login-hero">
        <div className="login-hero-texto">
          <span className="login-hero-eyebrow">RUTAS DARIANAS · LEÓN</span>
          <h1 className="login-hero-titulo">Bienvenido a<br />Wheregüense</h1>
          <p className="login-hero-sub">
            Recorre la ciudad, sella tu pasaporte y colecciona la cultura de León.
          </p>
        </div>
        <img className="login-hero-ilustracion" src={ilustracionGigantona} alt="" />
      </div>

      <div className="login-panel">
        <button
          className="login-btn login-btn-invitado"
          onClick={onIniciarComoInvitado}
        >
          Continuar como invitado
        </button>

        <div className="login-separador">
          <span>o continuá con</span>
        </div>

        <button
          className="login-btn login-btn-secundario"
          onClick={() => handleProximamente('Google')}
        >
          <img src={iconoGoogle} alt="" />
          Continuar con Google
        </button>
        <button
          className="login-btn login-btn-secundario"
          onClick={() => handleProximamente('correo')}
        >
          <img src={iconoCorreo} alt="" />
          Continuar con correo
        </button>

        <p className="login-crear-cuenta">
          ¿No tienes cuenta?{' '}
          <span onClick={() => handleProximamente('correo')}>crea una</span>
        </p>
      </div>
    </div>
  );
}

export default Login;
