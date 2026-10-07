import { useEffect, useRef, useState } from 'react';
import { Camera, Check } from 'lucide-react';
import './OnboardingCuaderno.css';
import logoW from '../assets/cuaderno_w.png';
import logoNombre from '../assets/cuaderno_nombre.png';
import cabezonImg from '../assets/pasaporte_avatar_cabezon.webp';
import gigantonaImg from '../assets/pasaporte_avatar_gigantona.webp';
import { redimensionarImagen } from '../utils/fotoPerfil';

const COMPANEROS = [
  { valor: 'enano', nombre: 'Cabezón', texto: 'Pequeño, veloz y curioso. Nunca se pierde una fiesta.', imagen: cabezonImg },
  { valor: 'gigantona', nombre: 'Gigantona', texto: 'Elegante y llamativa. Baila por encima de todos.', imagen: gigantonaImg },
];

const PAISES = ['Nicaragua', 'Honduras', 'Costa Rica', 'El Salvador', 'Guatemala', 'Panamá', 'México', 'Colombia', 'Estados Unidos', 'España', 'Otro país'];
const CODIGOS = ['+505', '+504', '+506', '+503', '+502', '+507', '+52', '+57', '+1', '+34'];
const IDIOMAS = [{ valor: 'es', texto: 'Español' }, { valor: 'en', texto: 'English' }];
const GENEROS = [{ valor: 'masculino', texto: 'Masculino' }, { valor: 'femenino', texto: 'Femenino' }, { valor: 'prefiero_no_decir', texto: 'Prefiero no decir' }];
const TIPOS_FOTO = ['image/jpeg', 'image/png', 'image/webp'];
const ANILLAS = Array.from({ length: 11 }, (_, i) => i);

function hoy() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// El registro del turista como un cuaderno de pasaporte: portada, compañero, datos y bienvenida.
//   onGuardarDatos(datos) -> Promise<boolean>: guarda nombre, país, idioma y los datos nuevos; el error (ej. nombre repetido) llega en `error`.
//   onTerminar(companero): guarda el personaje y entra a la app; su error llega en `errorFinal`.
function OnboardingCuaderno({ valorInicial, onGuardarDatos, onTerminar, guardando, error, guardandoFinal, errorFinal, onVolverALanding }) {
  const [pagina, setPagina] = useState(0);
  const [companero, setCompanero] = useState(null);
  const [nombre, setNombre] = useState(valorInicial?.nombre || '');
  const [pais, setPais] = useState(valorInicial?.pais || 'Nicaragua');
  const [idioma, setIdioma] = useState(valorInicial?.idioma || 'es');
  const [nacimiento, setNacimiento] = useState('');
  const [codigo, setCodigo] = useState('+505');
  const [telefono, setTelefono] = useState('');
  const [genero, setGenero] = useState('');
  const [foto, setFoto] = useState(null);
  const [errores, setErrores] = useState({});
  const archivoRef = useRef(null);
  const libroRef = useRef(null);
  const primeraVez = useRef(true);

  useEffect(() => {
    if (primeraVez.current) { primeraVez.current = false; return undefined; }
    const id = setTimeout(() => libroRef.current?.querySelector('.oc-hoja:not([inert]) [data-foco]')?.focus(), 500);
    return () => clearTimeout(id);
  }, [pagina]);

  const paises = PAISES.includes(pais) ? PAISES : [pais, ...PAISES];

  const handleFoto = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!TIPOS_FOTO.includes(file.type)) {
      setErrores((x) => ({ ...x, foto: 'Usa una foto JPG, PNG o WebP.' }));
      return;
    }
    try {
      setFoto(await redimensionarImagen(file));
      setErrores((x) => ({ ...x, foto: '' }));
    } catch {
      setErrores((x) => ({ ...x, foto: 'No se pudo usar esa imagen. Prueba con otra.' }));
    }
  };

  const handleEnviar = async (e) => {
    e.preventDefault();
    const digitos = telefono.replace(/\D/g, '');
    const nuevos = {};
    if (!nombre.trim()) nuevos.nombre = 'Escribe tu nombre de usuario.';
    if (!pais) nuevos.pais = 'Selecciona tu país.';
    if (!nacimiento) nuevos.nacimiento = 'Indica tu fecha de nacimiento.';
    else if (nacimiento < '1900-01-01' || nacimiento > hoy()) nuevos.nacimiento = 'Revisa tu fecha de nacimiento.';
    if (digitos && (digitos.length < 4 || digitos.length > 14)) nuevos.telefono = 'El teléfono debe tener entre 4 y 14 dígitos.';
    setErrores((x) => ({ foto: x.foto, ...nuevos }));
    if (Object.keys(nuevos).length) return;

    const ok = await onGuardarDatos({
      nombre: nombre.trim(),
      pais,
      idioma,
      fechaNacimiento: nacimiento,
      telefono: digitos ? `${codigo} ${digitos}` : null,
      genero: genero || null,
      foto,
    });
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
              <p className="oc-grupo">Obligatorios *</p>
              <div className={`oc-campo ${errores.nombre ? 'oc-campo--error' : ''}`}>
                <label htmlFor="oc-usuario">Nombre de usuario <b>*</b></label>
                <input id="oc-usuario" className="oc-mano" type="text" placeholder="Cómo te verán otros viajeros" autoComplete="off" maxLength={40} value={nombre} disabled={guardando} onChange={(e) => { setNombre(e.target.value); setErrores((x) => ({ ...x, nombre: '' })); }} />
                {errores.nombre && <span className="oc-msg">{errores.nombre}</span>}
              </div>
              <div className={`oc-campo ${errores.pais ? 'oc-campo--error' : ''}`}>
                <label htmlFor="oc-pais">País de origen <b>*</b></label>
                <select id="oc-pais" className="oc-mano" value={pais} disabled={guardando} onChange={(e) => setPais(e.target.value)}>
                  {paises.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div className="oc-campo">
                <span className="oc-etq">Idioma preferido <b>*</b></span>
                <div className="oc-opciones" role="radiogroup" aria-label="Idioma preferido">
                  {IDIOMAS.map((i) => (
                    <label key={i.valor}>
                      <input type="radio" name="oc-idioma" value={i.valor} checked={idioma === i.valor} disabled={guardando} onChange={() => setIdioma(i.valor)} />
                      <span>{i.texto}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className={`oc-campo ${errores.nacimiento ? 'oc-campo--error' : ''}`}>
                <label htmlFor="oc-nacimiento">Fecha de nacimiento <b>*</b></label>
                <input id="oc-nacimiento" className="oc-mano" type="date" min="1900-01-01" max={hoy()} value={nacimiento} disabled={guardando} onChange={(e) => { setNacimiento(e.target.value); setErrores((x) => ({ ...x, nacimiento: '' })); }} />
                {errores.nacimiento && <span className="oc-msg">{errores.nacimiento}</span>}
              </div>

              <p className="oc-grupo">Opcionales</p>
              <div className={`oc-campo ${errores.telefono ? 'oc-campo--error' : ''}`}>
                <label htmlFor="oc-telefono">Teléfono</label>
                <div className="oc-tel">
                  <select className="oc-mano oc-cod" aria-label="Código de país" value={codigo} disabled={guardando} onChange={(e) => setCodigo(e.target.value)}>
                    {CODIGOS.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <input id="oc-telefono" className="oc-mano" type="tel" inputMode="tel" placeholder="8888 8888" maxLength={20} value={telefono} disabled={guardando} onChange={(e) => { setTelefono(e.target.value); setErrores((x) => ({ ...x, telefono: '' })); }} />
                </div>
                {errores.telefono && <span className="oc-msg">{errores.telefono}</span>}
              </div>
              <div className="oc-campo">
                <span className="oc-etq">Género</span>
                <div className="oc-opciones" role="radiogroup" aria-label="Género">
                  {GENEROS.map((g) => (
                    <label key={g.valor}>
                      <input type="radio" name="oc-genero" value={g.valor} checked={genero === g.valor} disabled={guardando} onChange={() => setGenero(g.valor)} />
                      <span>{g.texto}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="oc-campo">
                <span className="oc-etq">Foto de perfil</span>
                <button type="button" className="oc-foto-pegar" disabled={guardando} onClick={() => archivoRef.current?.click()}>
                  <span className="oc-foto-marco">
                    {foto ? <img src={foto} alt="Tu foto de perfil" /> : <Camera size={24} strokeWidth={1.9} aria-hidden="true" />}
                  </span>
                  <span><strong>{foto ? 'Cambiar foto' : 'Pegar una foto'}</strong><small>Puedes cambiarla después</small></span>
                </button>
                <input ref={archivoRef} type="file" accept={TIPOS_FOTO.join(',')} hidden onChange={handleFoto} />
                {errores.foto && <span className="oc-msg">{errores.foto}</span>}
              </div>

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
