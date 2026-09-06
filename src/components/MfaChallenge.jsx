import { useEffect, useRef, useState } from 'react';
import './MfaChallenge.css';
import { supabase } from '../lib/supabaseClient';

function MfaChallenge({ factorId, onVerificado, onCerrarSesion }) {
  const [challengeId, setChallengeId] = useState('');
  const [cargando, setCargando] = useState(true);
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
      const { data, error: err } = await supabase.auth.mfa.challenge({ factorId });
      setCargando(false);
      if (err) {
        setError(err.message || 'No se pudo iniciar la verificación.');
        return;
      }
      setChallengeId(data.id);
    })();
  }, [factorId]);

  const handleVerificar = async (e) => {
    e.preventDefault();
    const code = codigo.trim();
    if (!/^\d{6}$/.test(code)) {
      setError('Ingresa el código de 6 dígitos de tu app autenticadora.');
      return;
    }
    setVerificando(true);
    setError('');
    const { error: err } = await supabase.auth.mfa.verify({ factorId, challengeId, code });
    setVerificando(false);
    if (err) {
      setError(err.message || 'Código incorrecto o vencido.');
      return;
    }
    onVerificado();
  };

  return (
    <div className="mfa-wrapper">
      <div className="mfa-panel">
        <h1 className="mfa-titulo">Verificación en dos pasos</h1>
        <p className="mfa-sub">Ingresa el código de tu app autenticadora para continuar.</p>

        {cargando && <p className="mfa-cargando">Preparando verificación…</p>}

        {!cargando && challengeId && (
          <form className="mfa-form" onSubmit={handleVerificar}>
            <label className="mfa-label" htmlFor="mfa-codigo-challenge">Código de 6 dígitos</label>
            <input
              id="mfa-codigo-challenge"
              className="mfa-input"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder="123456"
              value={codigo}
              onChange={(e) => { setCodigo(e.target.value.replace(/\D/g, '')); setError(''); }}
              disabled={verificando}
              autoFocus
            />
            <button className="mfa-btn" type="submit" disabled={verificando}>
              {verificando ? 'Verificando…' : 'Verificar'}
            </button>
          </form>
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

export default MfaChallenge;
