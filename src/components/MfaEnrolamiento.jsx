import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import './MfaEnrolamiento.css';
import { supabase } from '../lib/supabaseClient';

// Una sola activación a la vez por usuario, compartida entre montajes del componente. App.jsx puede desmontar y volver a montar
// esta pantalla (por ejemplo mientras carga la fila de usuario); sin esto cada montaje creaba un factor nuevo y el QR que la
// persona ya había escaneado dejaba de coincidir con el factor que se verifica ("Invalid TOTP code entered").
let activacion = null; // { usuarioId, promesa }

// Además se guarda en sessionStorage (solo esta pestaña): si la página se recarga a mitad de la activación se reutiliza el MISMO
// factor y el mismo QR en vez de crear otro. El secreto de un factor pendiente solo se entrega al crearlo, por eso se guarda entero.
const CLAVE_ACTIVACION = 'mfaActivacionPendiente';

function leerGuardada(usuarioId) {
  try {
    const g = JSON.parse(sessionStorage.getItem(CLAVE_ACTIVACION));
    return g && g.usuarioId === usuarioId ? g.factor : null;
  } catch {
    return null;
  }
}

function guardar(usuarioId, factor) {
  try {
    sessionStorage.setItem(CLAVE_ACTIVACION, JSON.stringify({ usuarioId, factor }));
  } catch {
    // sin almacenamiento (modo privado): vale igual dentro de esta carga de la página
  }
}

function olvidarActivacion() {
  activacion = null;
  try {
    sessionStorage.removeItem(CLAVE_ACTIVACION);
  } catch {
    // nada que borrar
  }
}

async function crearFactor(usuarioId) {
  // listFactors().totp solo trae los VERIFICADOS; los pendientes están en .all.
  const { data: existentes } = await supabase.auth.mfa.listFactors();
  const pendientes = (existentes?.all || []).filter((f) => f.factor_type === 'totp' && f.status !== 'verified');

  // Si ya hay uno guardado de esta sesión y sigue pendiente en Supabase, se reutiliza; los demás pendientes sobran.
  const guardada = leerGuardada(usuarioId);
  const reutilizable = guardada && pendientes.some((f) => f.id === guardada.id) ? guardada : null;
  for (const f of pendientes) {
    if (!reutilizable || f.id !== reutilizable.id) await supabase.auth.mfa.unenroll({ factorId: f.id });
  }
  if (reutilizable) return reutilizable;

  const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: `totp-${Date.now()}` });
  if (error) throw error;
  const factor = { id: data.id, qrCode: data.totp.qr_code, uri: data.totp.uri || '', secreto: data.totp.secret };
  guardar(usuarioId, factor);
  return factor;
}

function obtenerActivacion(usuarioId) {
  if (!activacion || activacion.usuarioId !== usuarioId) {
    const promesa = crearFactor(usuarioId);
    activacion = { usuarioId, promesa };
    promesa.catch(() => { if (activacion?.promesa === promesa) activacion = null; }); // si falla, el próximo intento vuelve a empezar
  }
  return activacion.promesa;
}

function MfaEnrolamiento({ onCompletado, onCerrarSesion }) {
  const [cargando, setCargando] = useState(true);
  const [qrCode, setQrCode] = useState('');
  const [uri, setUri] = useState('');
  const [secreto, setSecreto] = useState('');
  const [factorId, setFactorId] = useState('');
  const [codigo, setCodigo] = useState('');
  const [verificando, setVerificando] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let activo = true;
    (async () => {
      setCargando(true);
      setError('');
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const factor = await obtenerActivacion(session?.user?.id ?? 'sin-sesion');
        if (!activo) return;
        setFactorId(factor.id);
        setQrCode(factor.qrCode);
        setUri(factor.uri);
        setSecreto(factor.secreto);
      } catch (err) {
        if (activo) setError(err?.message || 'No se pudo iniciar la activación de 2FA.');
      }
      if (activo) setCargando(false);
    })();
    return () => { activo = false; };
  }, []);

  const handleVerificar = async (e) => {
    e.preventDefault();
    const code = codigo.trim();
    if (!/^\d{6}$/.test(code)) {
      setError('Ingresa el código de 6 dígitos de tu app autenticadora.');
      return;
    }
    setVerificando(true);
    setError('');
    const { data: challenge, error: errChallenge } = await supabase.auth.mfa.challenge({ factorId });
    if (errChallenge) {
      setVerificando(false);
      setError(errChallenge.message || 'No se pudo iniciar la verificación.');
      return;
    }
    const { error: errVerify } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challenge.id,
      code,
    });
    setVerificando(false);
    if (errVerify) {
      setError('Código incorrecto. Escanea el QR que ves ahora (si ya tenías una entrada de Wheregüense en tu app, bórrala), comprueba que la hora de tu teléfono esté en automático y escribe el código nuevo.');
      return;
    }
    olvidarActivacion();
    onCompletado();
  };

  return (
    <div className="mfa-wrapper">
      <div className="mfa-panel">
        <h1 className="mfa-titulo">Protege tu cuenta</h1>
        <p className="mfa-sub">
          Activa la verificación en dos pasos escaneando este código con Google Authenticator, Authy
          u otra app compatible.
        </p>

        {cargando && <p className="mfa-cargando">Generando código QR…</p>}

        {!cargando && (uri || qrCode) && (
          <>
            {/* El QR se dibuja aquí con la URI otpauth:// (SVG propio): no depende del SVG/data URI que manda Supabase,
                que algunos navegadores móviles muestran como texto. */}
            {uri ? (
              <div className="mfa-qr" role="img" aria-label="Código QR para tu app autenticadora">
                <QRCodeSVG value={uri} size={200} level="M" marginSize={2} bgColor="#FFFFFF" fgColor="#000000" />
              </div>
            ) : (
              <div className="mfa-qr" dangerouslySetInnerHTML={{ __html: qrCode }} />
            )}
            <p className="mfa-secreto-label">¿No podés escanear? Ingresa este código manualmente:</p>
            <code className="mfa-secreto">{secreto}</code>

            <form className="mfa-form" onSubmit={handleVerificar}>
              <label className="mfa-label" htmlFor="mfa-codigo">Código de 6 dígitos</label>
              <input
                id="mfa-codigo"
                className="mfa-input"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="123456"
                value={codigo}
                onChange={(e) => { setCodigo(e.target.value.replace(/\D/g, '')); setError(''); }}
                disabled={verificando}
              />
              <button className="mfa-btn" type="submit" disabled={verificando}>
                {verificando ? 'Verificando…' : 'Activar 2FA'}
              </button>
            </form>
          </>
        )}

        {error && <p className="mfa-error">{error}</p>}

        {onCerrarSesion && (
          <button className="mfa-cerrar-sesion" type="button" onClick={() => { olvidarActivacion(); onCerrarSesion(); }}>
            Cerrar sesión
          </button>
        )}
      </div>
    </div>
  );
}

export default MfaEnrolamiento;
