import './Login.css';
import iconoGoogle from '../assets/flujo-inicial/google_hd.png';
import iconoCorreo from '../assets/flujo-inicial/email_hd.png';
import iconoInvitado from '../assets/flujo-inicial/icon_user_hd.png';

function Login({ onIniciarComoInvitado }) {
  const handleProximamente = (metodo) => {
    window.alert(`Continuar con ${metodo}: próximamente 🚧 (por ahora usá "Continuar como invitado")`);
  };

  return (
    <div className="login-wrapper">
      <div className="login-esquina"></div>

      <div className="login-contenido">
        <h1 className="login-titulo">Bienvenido a<br/>Wheregüense</h1>

        <button className="login-btn" onClick={() => handleProximamente('Google')}>
          <img src={iconoGoogle} alt="" />
          Continuar con Google
        </button>
        <button className="login-btn" onClick={() => handleProximamente('correo')}>
          <img src={iconoCorreo} alt="" />
          Continuar con correo
        </button>
        <button className="login-btn login-btn-invitado" onClick={onIniciarComoInvitado}>
          <img src={iconoInvitado} alt="" />
          Continuar como invitado
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