import { useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, ChevronUp, GripVertical, ImagePlus, Trash2 } from 'lucide-react';
import PerfilNegocioPublico from './PerfilNegocioPublico';
import {
  LAYOUTS,
  LETRAS,
  PALETAS,
  SECCIONES,
  configDesdeDiseno,
  disenoDesdeConfig,
  disenosIguales,
  textoSobre,
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

// Pestaña "Diseño" del panel del emprendedor: editor a un lado y vista previa en vivo de la ficha que ve el turista.
// El borrador solo vive aquí hasta pulsar Guardar; "Deshacer" vuelve al último diseño guardado.
function EditorDiseno({ negocio, onGuardar, onSubirPortada }) {
  const guardado = useMemo(() => disenoDesdeConfig(negocio?.configDiseno), [negocio?.configDiseno]);
  const [borrador, setBorrador] = useState(guardado);
  const [filas, setFilas] = useState(() => filasDesdeDiseno(guardado));
  const [subiendo, setSubiendo] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [aviso, setAviso] = useState(null); // { tipo: 'ok' | 'error', texto }
  const [arrastrando, setArrastrando] = useState(null);
  const [soltarSobre, setSoltarSobre] = useState(false);
  const archivoRef = useRef(null);

  const diseno = useMemo(
    () => ({ ...borrador, secciones: filas.filter((f) => f.visible).map((f) => f.id) }),
    [borrador, filas],
  );
  const hayCambios = !disenosIguales(diseno, guardado);
  const whatsappOk = digitosValidos(borrador.whatsapp);
  const nombre = negocio?.nombre || 'Tu negocio';

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
      ? { tipo: 'ok', texto: 'Diseño guardado. Así lo ven los turistas.' }
      : { tipo: 'error', texto: resultado?.mensaje || 'No se pudo guardar el diseño.' });
  };

  const subirArchivo = async (archivo) => {
    if (!archivo) return;
    setSubiendo(true);
    setAviso(null);
    const resultado = await onSubirPortada(archivo);
    setSubiendo(false);
    if (resultado?.exito) {
      cambiar({ portadaUrl: resultado.url });
    } else {
      setAviso({ tipo: 'error', texto: resultado?.mensaje || 'No se pudo subir la portada.' });
    }
  };

  const telefonoDigitos = (negocio?.telefono || '').replace(/\D/g, '');
  const puedeUsarTelefono = borrador.whatsapp === '' && /^[0-9]{8,15}$/.test(telefonoDigitos);

  return (
    <div className="editor-diseno">
      <div className="editor-diseno-columna">
        <header className="editor-diseno-cabecera">
          <span className="editor-diseno-inicial" aria-hidden="true">{nombre.trim().charAt(0).toUpperCase() || 'N'}</span>
          <div>
            <h2>{nombre}</h2>
            <p>Vista previa en vivo</p>
          </div>
        </header>

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
            ref={archivoRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            hidden
            onChange={(e) => {
              subirArchivo(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
          <button
            type="button"
            className={`editor-diseno-soltar${soltarSobre ? ' sobre' : ''}`}
            disabled={subiendo}
            onClick={() => archivoRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setSoltarSobre(true); }}
            onDragLeave={() => setSoltarSobre(false)}
            onDrop={(e) => {
              e.preventDefault();
              setSoltarSobre(false);
              subirArchivo(e.dataTransfer.files?.[0]);
            }}
          >
            <ImagePlus size={20} strokeWidth={1.8} aria-hidden="true" />
            {subiendo ? 'Subiendo...' : borrador.portadaUrl ? 'Cambiar foto de portada' : 'Subir foto de portada'}
          </button>
          <p className="editor-diseno-ayuda">JPG, PNG o WebP, hasta 10 MB.</p>
          {borrador.portadaUrl && (
            <button type="button" className="editor-diseno-enlace" onClick={() => cambiar({ portadaUrl: null })}>
              <Trash2 size={15} strokeWidth={2} aria-hidden="true" /> Quitar portada
            </button>
          )}
        </section>

        <section className="editor-diseno-bloque" aria-labelledby="ed-secciones">
          <h3 id="ed-secciones">Secciones: orden y visibilidad</h3>
          <ul className="editor-diseno-secciones">
            {filas.map((fila, i) => (
              <li
                key={fila.id}
                className={`editor-diseno-seccion${arrastrando === i ? ' arrastrando' : ''}${fila.visible ? '' : ' oculta'}`}
                draggable
                onDragStart={() => setArrastrando(i)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => { mover(arrastrando, i); setArrastrando(null); }}
                onDragEnd={() => setArrastrando(null)}
              >
                <GripVertical size={18} strokeWidth={1.8} aria-hidden="true" className="editor-diseno-asa" />
                <span className="editor-diseno-seccion-nombre">{NOMBRE_SECCION[fila.id]}</span>
                <button type="button" className="editor-diseno-mover" onClick={() => mover(i, i - 1)} disabled={i === 0} aria-label={`Subir ${NOMBRE_SECCION[fila.id]}`}>
                  <ChevronUp size={18} strokeWidth={2.2} aria-hidden="true" />
                </button>
                <button type="button" className="editor-diseno-mover" onClick={() => mover(i, i + 1)} disabled={i === filas.length - 1} aria-label={`Bajar ${NOMBRE_SECCION[fila.id]}`}>
                  <ChevronDown size={18} strokeWidth={2.2} aria-hidden="true" />
                </button>
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
            id="ed-whatsapp-campo"
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

      <aside className="editor-diseno-vista" aria-label="Vista previa de la ficha">
        <p className="editor-diseno-vista-titulo">Ficha que ve el turista</p>
        <div className="editor-diseno-vista-marco">
          <PerfilNegocioPublico
            incrustado
            vistaPrevia
            negocio={{
              id: negocio?.id,
              name: negocio?.nombre,
              categoria: negocio?.categoria,
              descripcion: negocio?.descripcion,
              telefono: negocio?.telefono,
            }}
            diseno={diseno}
            logoUrl={negocio?.logoUrl}
          />
        </div>
      </aside>
    </div>
  );
}

export default EditorDiseno;
