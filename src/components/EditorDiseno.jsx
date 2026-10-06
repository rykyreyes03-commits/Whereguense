import { useMemo, useRef, useState } from 'react';
import { Camera, Check, ChevronDown, ChevronUp, GripVertical, ImagePlus, Trash2 } from 'lucide-react';
import {
  LAYOUTS,
  LETRAS,
  PALETAS,
  SECCIONES,
  configDesdeDiseno,
  disenoDesdeConfig,
  disenosIguales,
  textoSobre,
  MAX_DESCRIPCION,
} from '../utils/diseno';
import './EditorDiseno.css';

const NOMBRE_SECCION = Object.fromEntries(SECCIONES.map((s) => [s.id, s.nombre]));

// Orden completo de las cinco secciones para el editor: primero las visibles (en su orden guardado), luego las ocultas.
function filasDesdeDiseno(d) {
  const ocultas = SECCIONES.map((s) => s.id).filter((id) => !d.secciones.includes(id));
  return [...d.secciones.map((id) => ({ id, visible: true })), ...ocultas.map((id) => ({ id, visible: false }))];
}

function digitosValidos(w) {
  return w === '' || /^[0-9]{8,15}$/.test(w);
}

// Pestaña "Diseño" del panel del emprendedor. El borrador solo vive aquí hasta pulsar Guardar; "Deshacer" vuelve al último
// diseño guardado. La ficha que ve el turista se abre con "Ver como te ven los turistas" del panel.
function EditorDiseno({ negocio, onGuardar, onSubirPortada, onSubirLogo }) {
  // Un negocio que aún no guardó descripción en el diseño parte de la que ya tenía en su perfil (no cuenta como cambio).
  const guardado = useMemo(() => {
    const d = disenoDesdeConfig(negocio?.configDiseno);
    const propia = typeof negocio?.configDiseno?.descripcion === 'string';
    return propia ? d : { ...d, descripcion: (negocio?.descripcion || '').slice(0, MAX_DESCRIPCION) };
  }, [negocio?.configDiseno, negocio?.descripcion]);
  const [borrador, setBorrador] = useState(guardado);
  const [filas, setFilas] = useState(() => filasDesdeDiseno(guardado));
  const [subiendo, setSubiendo] = useState(null); // 'portada' | 'logo' | null
  const [guardando, setGuardando] = useState(false);
  const [aviso, setAviso] = useState(null); // { tipo: 'ok' | 'error', texto }
  const [arrastrando, setArrastrando] = useState(null);
  const [soltarSobre, setSoltarSobre] = useState(false);
  const portadaRef = useRef(null);
  const logoRef = useRef(null);
  const listaRef = useRef(null);
  const arrastreRef = useRef(null);

  const diseno = useMemo(
    () => ({ ...borrador, secciones: filas.filter((f) => f.visible).map((f) => f.id) }),
    [borrador, filas],
  );
  const hayCambios = !disenosIguales(diseno, guardado);
  const whatsappOk = digitosValidos(borrador.whatsapp);
  const nombre = negocio?.nombre || 'Tu negocio';
  const logo = borrador.logoUrl || negocio?.logoUrl || null; // sin logo en el diseño se ve el de siempre; sin ninguno, la inicial
  const [logoRoto, setLogoRoto] = useState(null);

  const cambiar = (parcial) => {
    setBorrador((b) => ({ ...b, ...parcial }));
    setAviso(null);
  };

  const mover = (desde, hasta) => {
    if (hasta < 0 || hasta >= filas.length || desde === hasta) return;
    setFilas((prev) => {
      const copia = [...prev];
      const [fila] = copia.splice(desde, 1);
      copia.splice(hasta, 0, fila);
      return copia;
    });
    setAviso(null);
  };

  const alternar = (id) => {
    setFilas((prev) => prev.map((f) => (f.id === id ? { ...f, visible: !f.visible } : f)));
    setAviso(null);
  };

  // Arrastre con puntero (ratón y dedo): se agarra el asa, y la fila toma el lugar de la que se cruza.
  const iniciarArrastre = (e, indice) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    arrastreRef.current = indice;
    setArrastrando(indice);
  };
  const arrastrar = (e) => {
    const actual = arrastreRef.current;
    if (actual === null || !listaRef.current) return;
    const items = [...listaRef.current.children];
    const destino = items.findIndex((el) => {
      const r = el.getBoundingClientRect();
      return e.clientY >= r.top && e.clientY < r.bottom;
    });
    if (destino !== -1 && destino !== actual) {
      mover(actual, destino);
      arrastreRef.current = destino;
      setArrastrando(destino);
    }
  };
  const terminarArrastre = () => {
    arrastreRef.current = null;
    setArrastrando(null);
  };

  const deshacer = () => {
    setBorrador(guardado);
    setFilas(filasDesdeDiseno(guardado));
    setAviso(null);
  };

  const guardar = async () => {
    if (!hayCambios || !whatsappOk || guardando) return;
    setGuardando(true);
    setAviso(null);
    const resultado = await onGuardar(configDesdeDiseno(diseno));
    setGuardando(false);
    setAviso(resultado?.exito
      ? { tipo: 'ok', texto: 'Diseño guardado.' }
      : { tipo: 'error', texto: resultado?.mensaje || 'No se pudo guardar el diseño.' });
  };

  const subirArchivo = async (archivo, cual) => {
    if (!archivo) return;
    setSubiendo(cual);
    setAviso(null);
    const resultado = await (cual === 'logo' ? onSubirLogo : onSubirPortada)(archivo);
    setSubiendo(null);
    if (resultado?.exito) {
      cambiar(cual === 'logo' ? { logoUrl: resultado.url } : { portadaUrl: resultado.url });
    } else {
      setAviso({ tipo: 'error', texto: resultado?.mensaje || 'No se pudo subir la imagen.' });
    }
  };

  const telefonoDigitos = (negocio?.telefono || '').replace(/\D/g, '');
  const puedeUsarTelefono = borrador.whatsapp === '' && /^[0-9]{8,15}$/.test(telefonoDigitos);
  const tipos = 'image/jpeg,image/png,image/webp';

  return (
    <div className="editor-diseno">
      <header className="editor-diseno-cabecera">
        <input
          ref={logoRef}
          type="file"
          accept={tipos}
          hidden
          data-campo="logo"
          onChange={(e) => {
            subirArchivo(e.target.files?.[0], 'logo');
            e.target.value = '';
          }}
        />
        <button
          type="button"
          className="editor-diseno-logo"
          onClick={() => logoRef.current?.click()}
          disabled={subiendo === 'logo'}
          aria-label={logo ? 'Cambiar logo del negocio' : 'Subir logo del negocio'}
        >
          {logo && logoRoto !== logo
            ? <img src={logo} alt="" onError={() => setLogoRoto(logo)} />
            : <span aria-hidden="true">{nombre.trim().charAt(0).toUpperCase() || 'N'}</span>}
          <span className="editor-diseno-logo-camara" aria-hidden="true"><Camera size={12} strokeWidth={2.4} /></span>
        </button>
        <div>
          <h2>{nombre}</h2>
          <p>{subiendo === 'logo' ? 'Subiendo logo...' : 'Vista previa en vivo'}</p>
        </div>
      </header>

      <section className="editor-diseno-bloque">
        <label htmlFor="ed-descripcion" className="editor-diseno-etiqueta">Descripción</label>
        <textarea
          id="ed-descripcion"
          className="editor-diseno-campo editor-diseno-descripcion"
          rows={4}
          maxLength={MAX_DESCRIPCION}
          placeholder="Describe tu negocio..."
          aria-describedby="ed-descripcion-contador"
          value={borrador.descripcion}
          onChange={(e) => cambiar({ descripcion: e.target.value.slice(0, MAX_DESCRIPCION) })}
        />
        <p id="ed-descripcion-contador" className="editor-diseno-contador">{[...borrador.descripcion].length}/{MAX_DESCRIPCION}</p>
      </section>

      <section className="editor-diseno-bloque" aria-labelledby="ed-colores">
        <h3 id="ed-colores">Colores</h3>
        <div className="editor-diseno-paletas" role="radiogroup" aria-labelledby="ed-colores">
          {PALETAS.map((p) => {
            const activa = borrador.paleta === p.id;
            return (
              <button
                key={p.id}
                type="button"
                role="radio"
                aria-checked={activa}
                aria-label={p.nombre}
                title={p.nombre}
                className={`editor-diseno-paleta${activa ? ' activa' : ''}`}
                style={{ background: p.color, color: textoSobre(p.color) }}
                onClick={() => cambiar({ paleta: p.id })}
              >
                {activa && <Check size={18} strokeWidth={3} aria-hidden="true" />}
              </button>
            );
          })}
        </div>
      </section>

      <section className="editor-diseno-bloque" aria-labelledby="ed-letra">
        <h3 id="ed-letra">Letra</h3>
        <div className="editor-diseno-opciones" role="radiogroup" aria-labelledby="ed-letra">
          {LETRAS.map((l) => (
            <button
              key={l.id}
              type="button"
              role="radio"
              aria-checked={borrador.letra === l.id}
              className={`editor-diseno-opcion${borrador.letra === l.id ? ' activa' : ''}`}
              style={{ fontFamily: l.titulo }}
              onClick={() => cambiar({ letra: l.id })}
            >
              {l.nombre}
            </button>
          ))}
        </div>
      </section>

      <section className="editor-diseno-bloque" aria-labelledby="ed-portada">
        <h3 id="ed-portada">Portada</h3>
        <input
          ref={portadaRef}
          type="file"
          accept={tipos}
          hidden
          data-campo="portada"
          onChange={(e) => {
            subirArchivo(e.target.files?.[0], 'portada');
            e.target.value = '';
          }}
        />
        <button
          type="button"
          className={`editor-diseno-soltar${soltarSobre ? ' sobre' : ''}`}
          disabled={subiendo === 'portada'}
          onClick={() => portadaRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setSoltarSobre(true); }}
          onDragLeave={() => setSoltarSobre(false)}
          onDrop={(e) => {
            e.preventDefault();
            setSoltarSobre(false);
            subirArchivo(e.dataTransfer.files?.[0], 'portada');
          }}
        >
          <ImagePlus size={20} strokeWidth={1.8} aria-hidden="true" />
          {subiendo === 'portada' ? 'Subiendo...' : borrador.portadaUrl ? 'Cambiar foto de portada' : 'Subir foto de portada'}
        </button>
        <p className="editor-diseno-ayuda">JPG, PNG o WebP, hasta 10 MB.</p>
        {borrador.portadaUrl && (
          <>
            <img className="editor-diseno-portada-miniatura" src={borrador.portadaUrl} alt="Portada actual" />
            <button type="button" className="editor-diseno-enlace" onClick={() => cambiar({ portadaUrl: null })}>
              <Trash2 size={15} strokeWidth={2} aria-hidden="true" /> Quitar portada
            </button>
          </>
        )}
      </section>

      <section className="editor-diseno-bloque" aria-labelledby="ed-secciones">
        <h3 id="ed-secciones">Secciones: orden y visibilidad</h3>
        <ul className="editor-diseno-secciones" ref={listaRef}>
          {filas.map((fila, i) => (
            <li
              key={fila.id}
              className={`editor-diseno-seccion${arrastrando === i ? ' arrastrando' : ''}${fila.visible ? '' : ' oculta'}`}
            >
              <button
                type="button"
                className="editor-diseno-asa"
                aria-label={`Arrastrar ${NOMBRE_SECCION[fila.id]}`}
                onPointerDown={(e) => iniciarArrastre(e, i)}
                onPointerMove={arrastrar}
                onPointerUp={terminarArrastre}
                onPointerCancel={terminarArrastre}
              >
                <GripVertical size={18} strokeWidth={1.8} aria-hidden="true" />
              </button>
              <span className="editor-diseno-seccion-nombre">{NOMBRE_SECCION[fila.id]}</span>
              {i > 0 ? (
                <button type="button" className="editor-diseno-mover" onClick={() => mover(i, i - 1)} aria-label={`Subir ${NOMBRE_SECCION[fila.id]}`}>
                  <ChevronUp size={18} strokeWidth={2.2} aria-hidden="true" />
                </button>
              ) : <span className="editor-diseno-mover-hueco" aria-hidden="true" />}
              {i < filas.length - 1 ? (
                <button type="button" className="editor-diseno-mover" onClick={() => mover(i, i + 1)} aria-label={`Bajar ${NOMBRE_SECCION[fila.id]}`}>
                  <ChevronDown size={18} strokeWidth={2.2} aria-hidden="true" />
                </button>
              ) : <span className="editor-diseno-mover-hueco" aria-hidden="true" />}
              <button
                type="button"
                role="switch"
                aria-checked={fila.visible}
                aria-label={`Mostrar ${NOMBRE_SECCION[fila.id]}`}
                className={`editor-diseno-interruptor${fila.visible ? ' activo' : ''}`}
                onClick={() => alternar(fila.id)}
              >
                <span />
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="editor-diseno-bloque" aria-labelledby="ed-whatsapp">
        <h3 id="ed-whatsapp">Botón de WhatsApp</h3>
        <input
          className={`editor-diseno-campo${whatsappOk ? '' : ' invalido'}`}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder="Ej. 50587074097"
          aria-labelledby="ed-whatsapp"
          aria-invalid={!whatsappOk}
          aria-describedby="ed-whatsapp-ayuda"
          value={borrador.whatsapp}
          maxLength={15}
          onChange={(e) => cambiar({ whatsapp: e.target.value.replace(/\D/g, '').slice(0, 15) })}
        />
        <p id="ed-whatsapp-ayuda" className={`editor-diseno-ayuda${whatsappOk ? '' : ' error'}`}>
          {whatsappOk
            ? 'Solo números, con código de país. Con 8 dígitos se usa el de Nicaragua (505). Vacío = sin botón.'
            : 'Escribe entre 8 y 15 dígitos, solo números.'}
        </p>
        {puedeUsarTelefono && (
          <button type="button" className="editor-diseno-enlace" onClick={() => cambiar({ whatsapp: telefonoDigitos.slice(0, 15) })}>
            Usar el teléfono de mi negocio
          </button>
        )}
      </section>

      <section className="editor-diseno-bloque" aria-labelledby="ed-layout">
        <h3 id="ed-layout">Productos y fotos como</h3>
        <div className="editor-diseno-segmentos" role="radiogroup" aria-labelledby="ed-layout">
          {LAYOUTS.map((l) => (
            <button
              key={l.id}
              type="button"
              role="radio"
              aria-checked={borrador.layoutProductos === l.id}
              className={borrador.layoutProductos === l.id ? 'activo' : ''}
              onClick={() => cambiar({ layoutProductos: l.id })}
            >
              {l.nombre}
            </button>
          ))}
        </div>
      </section>

      {aviso && (
        <p className={`editor-diseno-aviso ${aviso.tipo}`} role={aviso.tipo === 'error' ? 'alert' : 'status'}>{aviso.texto}</p>
      )}

      <div className="editor-diseno-acciones">
        <button type="button" className="editor-diseno-deshacer" onClick={deshacer} disabled={!hayCambios || guardando}>
          Deshacer
        </button>
        <button type="button" className="editor-diseno-guardar" onClick={guardar} disabled={!hayCambios || !whatsappOk || guardando}>
          {guardando ? 'Guardando...' : 'Guardar'}
        </button>
      </div>
    </div>
  );
}

export default EditorDiseno;
