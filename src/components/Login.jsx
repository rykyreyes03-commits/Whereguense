import { useRef, useState } from 'react';
import './Login.css';
import { supabase } from '../lib/supabaseClient';
import ilustracionGigantona from '../assets/flujo-inicial/gigantona.png';
import iconoGoogle from '../assets/flujo-inicial/google_hd.png';
import iconoCorreo from '../assets/flujo-inicial/email_hd.png';

function Login({ onIniciarComoInvitado, onVolverALanding, sesionExpirada }) {
  const [paso, setPaso] = useState('correo'); // 'correo' | 'codigo'
  const [email, setEmail] = useState('');
  const [codigo, setCodigo] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [verificando, setVerificando] = useState(false);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const emailInputRef = useRef(null);

  const handleProximamente = (metodo) => {
    window.alert(`Continuar con ${metodo}: próximamente 🚧 (por ahora usá "Continuar como invitado")`);
  };

  const irAPasoCorreo = () => {
    setPaso('correo');
    setCodigo('');
    setError('');
    setAviso('');
    requestAnimationFrame(() => emailInputRef.current?.focus());
  };

  const handleEnviarCodigo = async (e) => {
    if (e) e.preventDefault();
    const correo = email.trim();
    if (!correo) {
      setError('Escribe tu correo.');
      return;
    }
    setEnviando(true);
    setError('');
    setAviso('');
    const { error: err } = await supabase.auth.signInWithOtp({
      email: correo,
      options: { shouldCreateUser: true },
    });
    setEnviando(false);
    if (err) {
      setError(err.message || 'No se pudo enviar el código. Intenta de nuevo.');
      return;
    }
    setCodigo('');
    setPaso('codigo');
    setAviso(`Te enviamos un código de 6 dígitos a ${correo}.`);
  };

  const handleVerificar = async (e) => {
    if (e) e.preventDefault();
    const token = codigo.trim();
    const correo = email.trim();
    // El largo del código depende de la config del proyecto en Supabase
    // (aquí son 8 dígitos, pero puede cambiar). No lo atamos a un número fijo:
    // solo exigimos que sean dígitos y al menos 6.
    if (!/^\d{6,}$/.test(token)) {
      setError('Ingresa el código completo (solo números).');
      return;
    }
    setVerificando(true);
    setError('');

    // Correo ya existente -> type 'email'. Correo nuevo (Supabase generó el
    // código bajo el flujo de alta) -> type 'signup'. Probamos el primero y,
    // si falla, reintentamos automáticamente con el segundo antes de reportar.
    let { error: err } = await supabase.auth.verifyOtp({ email: correo, token, type: 'email' });
    if (err) {
      const reintento = await supabase.auth.verifyOtp({ email: correo, token, type: 'signup' });
      err = reintento.error;
    }

    setVerificando(false);
    if (err) {
      setError(err.message || 'Código incorrecto o expirado.');
      return;
    }
    // Sesión iniciada: App.jsx reacciona vía supabase.auth.onAuthStateChange
    // y decide a qué pantalla ir. Aquí no navegamos.
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
        {sesionExpirada && (
          <p className="login-otp-error">Tu sesión expiró. Inicia sesión de nuevo.</p>
        )}
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

        {paso === 'correo' ? (
          <form className="login-otp" onSubmit={handleEnviarCodigo}>
            <label className="login-otp-label" htmlFor="login-email">Correo</label>
            <input
              id="login-email"
              ref={emailInputRef}
              className="login-otp-input"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="tucorreo@ejemplo.com"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(''); }}
              disabled={enviando}
            />
            <button
              className="login-btn login-btn-secundario login-otp-btn"
              type="submit"
              disabled={enviando}
            >
              <img src={iconoCorreo} alt="" />
              {enviando ? 'Enviando…' : 'Enviar código'}
            </button>
          </form>
        ) : (
          <form className="login-otp" onSubmit={handleVerificar}>
            <label className="login-otp-label" htmlFor="login-codigo">Código de verificación</label>
            <input
              id="login-codigo"
              className="login-otp-input login-otp-input-codigo"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={8}
              placeholder="••••••"
              value={codigo}
              onChange={(e) => { setCodigo(e.target.value.replace(/\D/g, '')); setError(''); }}
              disabled={verificando}
            />
            <button
              className="login-btn login-btn-secundario login-otp-btn"
              type="submit"
              disabled={verificando}
            >
              {verificando ? 'Verificando…' : 'Verificar'}
            </button>
            <div className="login-otp-acciones">
              <button
                type="button"
                className="login-otp-link"
                onClick={handleEnviarCodigo}
                disabled={enviando}
              >
                {enviando ? 'Reenviando…' : 'Reenviar código'}
              </button>
              <button type="button" className="login-otp-link" onClick={irAPasoCorreo}>
                Cambiar correo
              </button>
            </div>
          </form>
        )}

        {aviso && !error && <p className="login-otp-aviso">{aviso}</p>}
        {error && <p className="login-otp-error">{error}</p>}

        <p className="login-crear-cuenta">
          ¿No tienes cuenta?{' '}
          <span onClick={irAPasoCorreo}>crea una</span>
        </p>
      </div>
    </div>
  );
}

export default Login;
