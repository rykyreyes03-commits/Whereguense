import { useEffect, useRef, useState } from 'react';
import './MfaEnrolamiento.css';
import { supabase } from '../lib/supabaseClient';

function MfaEnrolamiento({ onCompletado, onCerrarSesion }) {
  const [cargando, setCargando] = useState(true);
  const [qrCode, setQrCode] = useState('');
  const [secreto, setSecreto] = useState('');
  const [factorId, setFactorId] = useState('');
  const [codigo, setCodigo] = useState('');
  const [verificando, setVerificando] = useState(false);
  const [error, setError] = useState('');
  const inicioLanzadoRef = useRef(false);

  useEffect(() => {
    if (inicioLanzadoRef.current) return;
    inicioLanzadoRef.current = true;
    (async () => {
      setCargando(true);
      setError('');
      // Si quedó un factor sin verificar de un intento anterior (p. ej. si se
      // cerró la pestaña a mitad del proceso), lo limpiamos antes de crear
      // uno nuevo — Supabase no permite dos factores con el mismo nombre.
      const { data: existentes } = await supabase.auth.mfa.listFactors();
      const factorSinVerificar = existentes?.totp?.find((f) => f.status !== 'verified');
      if (factorSinVerificar) {
        await supabase.auth.mfa.unenroll({ factorId: factorSinVerificar.id });
      }
      const { data, error: err } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: `totp-${Date.now()}`,
      });
      setCargando(false);
      if (err) {
        setError(err.message || 'No se pudo iniciar la activación de 2FA.');
        return;
      }
      setFactorId(data.id);
      setQrCode(data.totp.qr_code);
      setSecreto(data.totp.secret);
    })();
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
      setError(errVerify.message || 'Código incorrecto. Intenta de nuevo.');
      return;
    }
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

        {!cargando && qrCode && (
          <>
            <div className="mfa-qr" dangerouslySetInnerHTML={{ __html: qrCode }} />
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
          <button className="mfa-cerrar-sesion" type="button" onClick={onCerrarSesion}>
            Cerrar sesión
          </button>
        )}
      </div>
    </div>
  );
}

export default MfaEnrolamiento;
