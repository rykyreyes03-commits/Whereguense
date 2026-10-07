import { useEffect, useRef, useState } from 'react';
import { Check } from 'lucide-react';
import './OnboardingCuaderno.css';
import logoW from '../assets/cuaderno_w.png';
import logoNombre from '../assets/cuaderno_nombre.png';
import cabezonImg from '../assets/pasaporte_avatar_cabezon.webp';
import gigantonaImg from '../assets/pasaporte_avatar_gigantona.webp';
import CamposDatosPerfil from './CamposDatosPerfil';
import { armarDatos, validarDatos, valoresDesdeUsuario } from '../utils/datosRegistro';

const COMPANEROS = [
  { valor: 'enano', nombre: 'Cabezón', texto: 'Pequeño, veloz y curioso. Nunca se pierde una fiesta.', imagen: cabezonImg },
  { valor: 'gigantona', nombre: 'Gigantona', texto: 'Elegante y llamativa. Baila por encima de todos.', imagen: gigantonaImg },
];

const ANILLAS = Array.from({ length: 11 }, (_, i) => i);

// El registro del turista como un cuaderno de pasaporte: portada, compañero, datos y bienvenida.
//   onGuardarDatos(datos) -> Promise<boolean>: guarda nombre, país, idioma y los datos nuevos; el error (ej. nombre repetido) llega en `error`.
//   onTerminar(companero): guarda el personaje y entra a la app; su error llega en `errorFinal`.
function OnboardingCuaderno({ valorInicial, onGuardarDatos, onTerminar, guardando, error, guardandoFinal, errorFinal, onVolverALanding }) {
  const [pagina, setPagina] = useState(0);
  const [companero, setCompanero] = useState(null);
  const [valores, setValores] = useState(() => valoresDesdeUsuario(null, valorInicial || {}));
  const [errores, setErrores] = useState({});
  const libroRef = useRef(null);
  const primeraVez = useRef(true);

  useEffect(() => {
    if (primeraVez.current) { primeraVez.current = false; return undefined; }
    const id = setTimeout(() => libroRef.current?.querySelector('.oc-hoja:not([inert]) [data-foco]')?.focus(), 500);
    return () => clearTimeout(id);
  }, [pagina]);

  const handleCambio = (campo, valor) => {
    setValores((v) => ({ ...v, [campo]: valor }));
    setErrores((e) => ({ ...e, [campo]: '' }));
  };

  const handleEnviar = async (e) => {
    e.preventDefault();
    const nuevos = validarDatos(valores);
    setErrores(nuevos);
    if (Object.keys(nuevos).length) return;
    const ok = await onGuardarDatos(armarDatos(valores));
    if (ok) setPagina(3);
  };

  const hoja = (i, extra = '') => `oc-hoja ${extra} ${i < pagina ? 'oc-volteada' : ''}`;
  const inactiva = (i) => (i === pagina ? {} : { inert: true, 'aria-hidden': true });

  return (
    <div className="oc-fondo">
      {onVolverALanding && pagina === 0 && (
        <button className="oc-salir" type="button" onClick={onVolverALanding}>← Volver al inicio</button>
      )}

      <main className="oc-libro" ref={libroRef}>
        <div className="oc-anillas" aria-hidden="true">{ANILLAS.map((i) => <i key={i} />)}</div>

        {/* Portada */}
        <button type="button" className={hoja(0, 'oc-tapa')} style={{ zIndex: 5 }} onClick={() => setPagina(1)} aria-label="Abrir el pasaporte" data-foco {...inactiva(0)}>
          <div className="oc-tapa-interior">
            <img className="oc-tapa-w" src={logoW} alt="" />
            <img className="oc-tapa-nombre" src={logoNombre} alt="WhereGüense" />
            <p className="oc-tapa-rep">República de</p>
            <div className="oc-tapa-pais">NICARAGUA</div>
            <div className="oc-tapa-linea" />
          </div>
          <div className="oc-tapa-anio">2026</div>
          <div className="oc-tapa-toca">TOCA PARA ABRIR</div>
        </button>

        {/* Página 1: compañero */}
        <section className={hoja(1, 'oc-papel')} style={{ zIndex: 4 }} {...inactiva(1)}>
          <div className="oc-contenido">
            <h1 className="oc-titulo" tabIndex={-1} data-foco>Elige tu compañero de aventura</h1>
            <p className="oc-sub">Lo vas a personalizar y llevar contigo por toda la ruta.</p>
            <div className="oc-companeros" role="radiogroup" aria-label="Compañero de aventura">
              {COMPANEROS.map((c) => (
                <button
                  key={c.valor}
                  type="button"
                  role="radio"
                  aria-checked={companero === c.valor}
                  className={`oc-comp ${companero === c.valor ? 'oc-comp--sel' : ''}`}
                  onClick={() => setCompanero(c.valor)}
                >
                  <span className="oc-comp-ok"><Check size={14} strokeWidth={3.5} aria-hidden="true" /></span>
                  <span className="oc-comp-foto"><img src={c.imagen} alt="" /></span>
                  <strong>{c.nombre}</strong>
                  <span className="oc-comp-texto">{c.texto}</span>
                </button>
              ))}
            </div>
            <div className="oc-espacio" />
            <button type="button" className="oc-boton" disabled={!companero} onClick={() => setPagina(2)}>Continuar →</button>
          </div>
          <button type="button" className="oc-atras" onClick={() => setPagina(0)}>← Portada</button>
          <span className="oc-pagina">1 / 3</span>
        </section>

        {/* Página 2: datos */}
        <section className={hoja(2, 'oc-papel')} style={{ zIndex: 3 }} {...inactiva(2)}>
          <div className="oc-contenido">
            <h1 className="oc-titulo-sello" tabIndex={-1} data-foco>Cuéntanos de ti</h1>
            <form onSubmit={handleEnviar} noValidate>
              <CamposDatosPerfil valores={valores} errores={errores} onCambio={handleCambio} deshabilitado={guardando} />

              <p className="oc-nota">Los campos con * son necesarios.</p>
              {error && <p className="oc-error" role="alert">{error}</p>}
              <button type="submit" className="oc-boton oc-boton--form" disabled={guardando}>{guardando ? 'Guardando…' : 'Sellar mis datos →'}</button>
            </form>
          </div>
          <button type="button" className="oc-atras" disabled={guardando} onClick={() => setPagina(1)}>← Atrás</button>
          <span className="oc-pagina">2 / 3</span>
        </section>

        {/* Página 3: bienvenida */}
        <section className={hoja(3, `oc-papel ${pagina === 3 ? 'oc-final-activa' : ''}`)} style={{ zIndex: 2 }} {...inactiva(3)}>
          <div className="oc-contenido oc-final">
            <div className="oc-sello-grande" role="img" aria-label="Bienvenido">
              <span className="oc-sello-aro" /><span className="oc-sello-aro2" />
              <small className="oc-sello-arriba">WHEREGÜENSE</small>
              <span className="oc-sello-txt">Bienvenido</span>
              <small className="oc-sello-abajo">NICARAGUA · 2026</small>
            </div>
            <p>Tu pasaporte está listo. Cada sitio que visites suma un sello.</p>
            {errorFinal && <p className="oc-error" role="alert">{errorFinal}</p>}
            <button type="button" className="oc-boton oc-boton--libre" data-foco disabled={guardandoFinal} onClick={() => onTerminar(companero)}>
              {guardandoFinal ? 'Guardando…' : 'Comenzar mi aventura'}
            </button>
          </div>
          <button type="button" className="oc-atras" disabled={guardandoFinal} onClick={() => setPagina(2)}>← Atrás</button>
          <span className="oc-pagina">3 / 3</span>
        </section>
      </main>
    </div>
  );
}

export default OnboardingCuaderno;
