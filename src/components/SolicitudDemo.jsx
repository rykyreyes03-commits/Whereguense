import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';

function SolicitudDemo() {
  const [nombre, setNombre] = useState('');
  const [correo, setCorreo] = useState('');
  const [organizacion, setOrganizacion] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState('');

  const enviar = async (e) => {
    e.preventDefault();
    if (enviando) return;
    if (!nombre.trim()) {
      setError('Escribe tu nombre.');
      return;
    }
    if (!correo.includes('@')) {
      setError('Escribe un correo válido, por ejemplo nombre@correo.com.');
      return;
    }
    setError('');
    setEnviando(true);
    const { error: err } = await supabase.rpc('crear_solicitud_demo', {
      p_nombre: nombre.trim(),
      p_correo: correo.trim(),
      p_organizacion: organizacion.trim() || null,
      p_mensaje: mensaje.trim() || null,
    });
    setEnviando(false);
    if (err) {
      setError(err.message || 'No pudimos enviar tu solicitud. Intenta de nuevo.');
      return;
    }
    setEnviado(true);
  };

  return (
    <section className="landing-demo" id="landing-demo">
      <div className="landing-demo-inner" data-reveal>
        <h2>¿Quieres probar Wheregüense con tu equipo?</h2>
        <p className="landing-demo-sub">Déjanos tus datos y te contactamos.</p>

        {enviado ? (
          <div className="landing-demo-ok" role="status">
            <svg viewBox="0 0 24 24" width="44" height="44" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <path d="M7.5 12.5l3 3 6-6.5" />
            </svg>
            <p>¡Listo! Te contactaremos pronto.</p>
          </div>
        ) : (
          <form className="landing-demo-form" onSubmit={enviar} noValidate>
            <label className="landing-demo-campo">
              <span>Nombre completo</span>
              <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={100} autoComplete="name" required />
            </label>
            <label className="landing-demo-campo">
              <span>Correo</span>
              <input type="email" value={correo} onChange={(e) => setCorreo(e.target.value)} maxLength={200} autoComplete="email" required />
            </label>
            <label className="landing-demo-campo">
              <span>Organización / Empresa <em>(opcional)</em></span>
              <input type="text" value={organizacion} onChange={(e) => setOrganizacion(e.target.value)} maxLength={150} autoComplete="organization" />
            </label>
            <label className="landing-demo-campo">
              <span>Mensaje <em>(opcional)</em></span>
              <textarea value={mensaje} onChange={(e) => setMensaje(e.target.value)} maxLength={1000} rows={4} />
            </label>
            <button className="landing-demo-btn" type="submit" disabled={enviando}>
              {enviando ? 'Enviando...' : 'Solicitar demo'}
            </button>
            {error && <p className="landing-demo-error" role="alert">{error}</p>}
          </form>
        )}
      </div>
    </section>
  );
}

export default SolicitudDemo;
