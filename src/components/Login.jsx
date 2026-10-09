import { useRef, useState } from 'react';
import './Login.css';
import { supabase } from '../lib/supabaseClient';
import ilustracionGigantona from '../assets/flujo-inicial/gigantona.png';
import iconoGoogle from '../assets/flujo-inicial/google_hd.png';
import iconoCorreo from '../assets/flujo-inicial/email_hd.png';

// Mensajes de Supabase Auth en español (lo que no se reconoce se muestra tal cual)
function traducirError(err) {
  const m = (err?.message || '').toLowerCase();
  if (m.includes('invalid login credentials')) {
    // Puede ser contraseña incorrecta O una cuenta creada con Google (que no tiene contraseña): Supabase no las distingue,
    // así que el mensaje cubre los dos casos.
    return 'Correo o contraseña incorrectos. Si creaste tu cuenta con Google, usa el botón "Continuar con Google".';
  }
  if (m.includes('email not confirmed')) return 'Confirma tu correo antes de iniciar sesión: te enviamos un mensaje al registrarte.';
  if (m.includes('already registered')) return 'Ese correo ya tiene una cuenta. Inicia sesión.';
  if (m.includes('rate limit') || err?.status === 429) return 'Demasiados intentos. Espera unos minutos e intenta de nuevo.';
  if (m.includes('password') && m.includes('characters')) return err.message;
  return err?.message || 'No se pudo completar. Intenta de nuevo.';
}

const MIN_CLAVE = 6;

function Login({ onVolverALanding, sesionExpirada }) {
  const [modo, setModo] = useState('entrar'); // 'entrar' | 'crear'
  const [email, setEmail] = useState('');
  const [clave, setClave] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const emailInputRef = useRef(null);

  // Google: Supabase manda a la persona a Google y la devuelve a esta misma página (en GitHub Pages: /Whereguense/).
  // La URL debe estar en Redirect URLs de Supabase. Al volver, App.jsx reacciona vía onAuthStateChange.
  const handleGoogle = async () => {
    setEnviando(true);
    setError('');
    setAviso('');
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + window.location.pathname },
    });
    if (err) {
      setEnviando(false);
      setError(traducirError(err));
    }
  };

  const cambiarModo = (nuevo) => {
    setModo(nuevo);
    setClave('');
    setConfirmar('');
    setError('');
    setAviso('');
    requestAnimationFrame(() => emailInputRef.current?.focus());
  };

  const handleEnviar = async (e) => {
    e.preventDefault();
    const correo = email.trim();
    if (!correo) {
      setError('Escribe tu correo.');
      return;
    }
    if (!clave) {
      setError('Escribe tu contraseña.');
      return;
    }
    if (modo === 'crear') {
      if (clave.length < MIN_CLAVE) {
        setError(`La contraseña debe tener al menos ${MIN_CLAVE} caracteres.`);
        return;
      }
      if (clave !== confirmar) {
        setError('Las contraseñas no coinciden.');
        return;
      }
    }
    setEnviando(true);
    setError('');
    setAviso('');

    if (modo === 'entrar') {
      const { error: err } = await supabase.auth.signInWithPassword({ email: correo, password: clave });
      setEnviando(false);
      if (err) setError(traducirError(err));
      // Sesión iniciada: App.jsx reacciona vía supabase.auth.onAuthStateChange y decide a qué pantalla ir.
      return;
    }

    const { data, error: err } = await supabase.auth.signUp({
      email: correo,
      password: clave,
      // Si el proyecto pide confirmar el correo, el enlace de confirmación vuelve a esta misma página.
      options: { emailRedirectTo: `${window.location.origin}${window.location.pathname}` },
    });
    setEnviando(false);
    if (err) {
      setError(traducirError(err));
      return;
    }
    // Con confirmación de correo activa, Supabase no avisa que el correo ya existe: devuelve un usuario sin identidades.
    if (data?.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      setError('Ese correo ya tiene una cuenta. Inicia sesión.');
      return;
    }
    if (!data?.session) {
      // El proyecto exige confirmar el correo antes de entrar
      cambiarModo('entrar');
      setAviso(`Te enviamos un correo a ${correo} para confirmar tu cuenta. Después de confirmarlo, inicia sesión con tu contraseña.`);
    }
    // Con sesión: App.jsx sigue el flujo (tipo de usuario y cuaderno).
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
          <p className="login-form-error">Tu sesión expiró. Inicia sesión de nuevo.</p>
        )}
        <button
          className="login-btn login-btn-secundario"
          type="button"
          onClick={handleGoogle}
          disabled={enviando}
        >
          <img src={iconoGoogle} alt="" />
          Continuar con Google
        </button>

        <div className="login-separador">
          <span>o con tu correo</span>
        </div>

        {modo === 'entrar' && (
          <p className="login-form-hint">
            ¿Entraste con Google la última vez? Usa el botón de arriba.
          </p>
        )}

        <form className="login-form" onSubmit={handleEnviar} noValidate>
          <label className="login-form-label" htmlFor="login-email">Correo</label>
          <input
            id="login-email"
            ref={emailInputRef}
            className="login-form-input"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="tucorreo@ejemplo.com"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setError(''); }}
            disabled={enviando}
          />
          <label className="login-form-label" htmlFor="login-clave">Contraseña</label>
          <input
            id="login-clave"
            className="login-form-input"
            type="password"
            autoComplete={modo === 'entrar' ? 'current-password' : 'new-password'}
            placeholder={modo === 'entrar' ? 'Tu contraseña' : `Mínimo ${MIN_CLAVE} caracteres`}
            value={clave}
            onChange={(e) => { setClave(e.target.value); setError(''); }}
            disabled={enviando}
          />
          {modo === 'crear' && (
            <>
              <label className="login-form-label" htmlFor="login-confirmar">Confirmar contraseña</label>
              <input
                id="login-confirmar"
                className="login-form-input"
                type="password"
                autoComplete="new-password"
                placeholder="Repite la contraseña"
                value={confirmar}
                onChange={(e) => { setConfirmar(e.target.value); setError(''); }}
                disabled={enviando}
              />
            </>
          )}
          <button
            className="login-btn login-btn-secundario login-form-btn"
            type="submit"
            disabled={enviando}
          >
            <img src={iconoCorreo} alt="" />
            {enviando ? (modo === 'entrar' ? 'Entrando…' : 'Creando cuenta…') : (modo === 'entrar' ? 'Iniciar sesión' : 'Crear cuenta')}
          </button>
        </form>

        {aviso && !error && <p className="login-form-aviso">{aviso}</p>}
        {error && <p className="login-form-error">{error}</p>}

        <p className="login-crear-cuenta">
          {modo === 'entrar' ? '¿No tienes cuenta? ' : '¿Ya tienes cuenta? '}
          <button type="button" className="login-form-link" onClick={() => cambiarModo(modo === 'entrar' ? 'crear' : 'entrar')}>
            {modo === 'entrar' ? 'Crea una' : 'Inicia sesión'}
          </button>
        </p>
      </div>
    </div>
  );
}

export default Login;
