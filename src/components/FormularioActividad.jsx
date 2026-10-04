import { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, ImagePlus, X } from 'lucide-react';
import './GenerarQR.css';
import './FormularioActividad.css';
import PantallaFormulario from './PantallaFormulario';
import TarjetaEvento from './TarjetaEvento';
import ControlHora from './ControlHora';
import CampoOtro from './CampoOtro';
import {
  CATEGORIAS,
  MAX_ETIQUETAS,
  MAX_LARGO_ETIQUETA,
  normalizarEtiqueta,
  claveEtiqueta,
  notaDiaSiguiente,
  fechaEscrita,
  hoyISO,
} from '../utils/eventos';

// Mismo límite de tamaño de foto que las fotos del negocio (PerfilNegocio).
const TAMANO_MAX_MB = 5;
// Máximo de canjes que se puede pedir para el sello de una actividad (026).
const MAX_CANJES = 200;
const TOTAL_PASOS = 3;
// Mismo mínimo que el trigger de la base (029): la descripción de una actividad nueva tiene al menos 20 caracteres.
const MIN_DESCRIPCION = 20;
const TITULOS = ['¿Qué vas a publicar?', '¿Cuándo y dónde?', 'Últimos detalles'];

// La base cuenta caracteres (char_length), no unidades UTF-16: un emoji vale 1.
const largo = (texto) => [...texto].length;

// "a", "a y b", "a, b y c"
function unirConY(lista) {
  if (lista.length <= 1) return lista.join('');
  return `${lista.slice(0, -1).join(', ')} y ${lista[lista.length - 1]}`;
}

// Formulario de una actividad nueva, en 3 pasos y en su propia pantalla (PantallaFormulario).
// "Siguiente" queda apagado y un texto encima dice qué falta ("Falta: nombre y foto").
//   onCrear(datos) -> { exito, mensaje, aviso }; onCerrar(resultado) se llama al guardar bien;
//   onSalir() se llama al volver atrás desde el primer paso.
function FormularioActividad({ organizador = null, onCrear, onCerrar, onSalir }) {
  const fotoInputRef = useRef(null);
  const tituloPasoRef = useRef(null);
  const primerRender = useRef(true);
  const [paso, setPaso] = useState(1);
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [categoria, setCategoria] = useState('');
  const [categoriaOtro, setCategoriaOtro] = useState('');
  const [lugar, setLugar] = useState('');
  const [horaInicio, setHoraInicio] = useState('');
  const [horaFin, setHoraFin] = useState('');
  const [horaInicioIncompleta, setHoraInicioIncompleta] = useState(false);
  const [horaFinIncompleta, setHoraFinIncompleta] = useState(false);
  const [eslogan, setEslogan] = useState('');
  const [detalles, setDetalles] = useState('');
  const [etiquetas, setEtiquetas] = useState([]);
  const [etiquetaTexto, setEtiquetaTexto] = useState('');
  const [errorEtiqueta, setErrorEtiqueta] = useState('');
  const [quiereSello, setQuiereSello] = useState(false);
  const [justificacion, setJustificacion] = useState('');
  const [limite, setLimite] = useState('');
  const [foto, setFoto] = useState(null);
  const [guardando, setGuardando] = useState(false);

  // Vista previa de la foto elegida (se libera al cambiarla o al salir).
  const fotoPrevia = useMemo(() => (foto ? URL.createObjectURL(foto) : null), [foto]);
  useEffect(() => () => {
    if (fotoPrevia) URL.revokeObjectURL(fotoPrevia);
  }, [fotoPrevia]);

  // Al cambiar de paso el foco pasa al título del paso (si no, se quedaría en un botón que cambia de significado).
  useEffect(() => {
    if (primerRender.current) { primerRender.current = false; return; }
    tituloPasoRef.current?.focus();
  }, [paso]);

  const hoy = hoyISO(); // día local: toISOString da el día UTC, que de noche en Nicaragua ya es mañana
  // Límite de canjes: obligatorio si pide sello (el trigger de 029 lo exige); sin sello no cuenta.
  const limiteNum = limite.trim() === '' ? null : Number(limite);
  const limiteInvalido = quiereSello && limiteNum !== null
    && (!Number.isInteger(limiteNum) || limiteNum < 1 || limiteNum > MAX_CANJES);
  const mensajeLimite = limiteNum !== null && limiteNum > MAX_CANJES
    ? `El máximo es ${MAX_CANJES} canjes.`
    : 'Escribe un número entero de 1 en adelante.';
  const fechasDesordenadas = Boolean(fechaInicio && fechaFin && fechaFin < fechaInicio);
  const horaIncompleta = horaInicioIncompleta || horaFinIncompleta;
  // Un mismo día con la misma hora de inicio y de fin no tiene duración.
  const horasIguales = Boolean(horaInicio) && horaInicio === horaFin && Boolean(fechaInicio) && fechaInicio === fechaFin;
  const notaHoras = notaDiaSiguiente(horaInicio, horaFin);

  // Lo que falta en cada paso (se muestra como "Falta: …") y los problemas que no son "falta" (se muestran tal cual).
  const faltanPorPaso = {
    1: [
      !nombre.trim() && 'nombre',
      !categoria && 'categoría',
      categoria === 'otro' && !categoriaOtro.trim() && 'cuál es la categoría',
      !descripcion.trim() ? 'descripción' : largo(descripcion.trim()) < MIN_DESCRIPCION && `descripción (mínimo ${MIN_DESCRIPCION} caracteres)`,
      !foto && 'foto',
    ].filter(Boolean),
    2: [
      !fechaInicio && 'fecha de inicio',
      !fechaFin && 'fecha de fin',
      horaIncompleta && 'AM o PM',
      !horaIncompleta && !horaInicio && 'hora de inicio',
      !horaIncompleta && !horaFin && 'hora de fin',
      !lugar.trim() && 'lugar',
    ].filter(Boolean),
    3: [
      quiereSello && !justificacion.trim() && 'justificación del sello',
      quiereSello && limiteNum === null && 'límite de canjes',
    ].filter(Boolean),
  };
  const problemasPorPaso = {
    1: [],
    2: [
      fechasDesordenadas && 'La fecha de fin no puede ser anterior a la de inicio.',
      horasIguales && 'La hora de fin no puede ser igual a la de inicio.',
    ].filter(Boolean),
    3: [limiteInvalido && mensajeLimite].filter(Boolean),
  };
  const faltan = faltanPorPaso[paso];
  const problemas = problemasPorPaso[paso];
  const puedeAvanzar = faltan.length === 0 && problemas.length === 0 && !guardando;
  const textoAviso = faltan.length > 0 ? `Falta: ${unirConY(faltan)}` : (problemas[0] || '');

  // Etiquetas (028): máximo 6, de 1 a 24 caracteres, sin repetir. Devuelve el mensaje de error o null.
  const errorParaEtiqueta = (limpia, actuales) => {
    if (limpia.length > MAX_LARGO_ETIQUETA) return `Máximo ${MAX_LARGO_ETIQUETA} caracteres por etiqueta.`;
    if (actuales.length >= MAX_ETIQUETAS) return `Máximo ${MAX_ETIQUETAS} etiquetas.`;
    if (actuales.some((e) => claveEtiqueta(e) === claveEtiqueta(limpia))) return 'Ya agregaste esa etiqueta.';
    return null;
  };

  const agregarEtiqueta = () => {
    const limpia = normalizarEtiqueta(etiquetaTexto);
    if (!limpia) {
      setEtiquetaTexto('');
      return;
    }
    const error = errorParaEtiqueta(limpia, etiquetas);
    if (error) {
      setErrorEtiqueta(error);
      return;
    }
    setEtiquetas([...etiquetas, limpia]);
    setEtiquetaTexto('');
    setErrorEtiqueta('');
  };

  const handleTeclaEtiqueta = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault(); // Enter no envía el formulario
      agregarEtiqueta();
    }
  };

  const quitarEtiqueta = (indice) => {
    setEtiquetas(etiquetas.filter((_, i) => i !== indice));
    setErrorEtiqueta('');
  };

  const handleFoto = (e) => {
    const archivo = e.target.files?.[0];
    e.target.value = '';
    if (!archivo) return;
    if (!archivo.type.startsWith('image/')) {
      window.alert('Elige un archivo de imagen.');
      return;
    }
    if (archivo.size / (1024 * 1024) > TAMANO_MAX_MB) {
      window.alert(`"${archivo.name}" pesa demasiado (máximo ${TAMANO_MAX_MB} MB). Prueba con una foto más liviana.`);
      return;
    }
    setFoto(archivo);
  };

  // Al elegir el día de inicio, el de fin se acomoda solo si estaba vacío o quedó antes (un evento de un día es lo más común).
  const cambiarFechaInicio = (valor) => {
    setFechaInicio(valor);
    if (valor && (!fechaFin || fechaFin < valor)) setFechaFin(valor);
  };

  const hayDatos = Boolean(nombre || descripcion || categoria || categoriaOtro || foto || fechaInicio || fechaFin
    || horaInicio || horaFin || horaIncompleta || lugar || eslogan || detalles || etiquetas.length || etiquetaTexto
    || quiereSello || justificacion || limite);

  // Las horas a medias viven dentro de ControlHora, que se desmonta al salir del paso 2: se olvida también el aviso.
  const irAPaso = (nuevo) => {
    if (paso === 2 && nuevo !== 2) {
      setHoraInicioIncompleta(false);
      setHoraFinIncompleta(false);
    }
    setPaso(nuevo);
  };

  const volver = () => {
    if (guardando) return; // no se puede salir con el guardado a medias
    if (paso > 1) {
      irAPaso(paso - 1);
      return;
    }
    if (hayDatos && !window.confirm('¿Salir sin guardar? Se perderá lo que escribiste.')) return;
    onSalir?.();
  };

  const handleCrear = async () => {
    if (!puedeAvanzar) return;

    // Una etiqueta escrita y sin confirmar con Enter también cuenta.
    let etiquetasFinal = etiquetas;
    const pendiente = normalizarEtiqueta(etiquetaTexto);
    if (pendiente) {
      const error = errorParaEtiqueta(pendiente, etiquetas);
      if (error) {
        setErrorEtiqueta(error);
        return;
      }
      etiquetasFinal = [...etiquetas, pendiente];
    }

    setGuardando(true);
    let resultado;
    try {
      resultado = await onCrear({
      nombre: nombre.trim(),
      descripcion: descripcion.trim(),
      fechaInicio: fechaInicio || null,
      fechaFin: fechaFin || null,
      solicitaSello: quiereSello,
      justificacion: justificacion.trim(),
      limiteCanjes: quiereSello ? limiteNum : null,
      foto,
      categoria: categoria || null,
      categoriaOtro: categoria === 'otro' ? categoriaOtro.trim() : null,
      lugar: lugar.trim() || null,
      horaInicio: horaInicio || null,
      horaFin: horaFin || null,
      eslogan: eslogan.trim() || null,
      detalles: detalles.trim() || null,
      etiquetas: etiquetasFinal.length > 0 ? etiquetasFinal : null,
      });
    } catch (error) {
      console.error('Error creando la actividad:', error);
      resultado = { exito: false, mensaje: 'No se pudo crear la actividad. Revisa tu conexión e intenta de nuevo.' };
    } finally {
      setGuardando(false);
    }

    if (!resultado.exito) {
      window.alert(resultado.mensaje);
      return;
    }
    onCerrar?.(resultado);
  };

  const avanzar = () => {
    if (!puedeAvanzar) return;
    if (paso < TOTAL_PASOS) irAPaso(paso + 1);
    else handleCrear();
  };

  const pie = (
    <>
      {/* La región siempre está en la página y solo cambia su texto: así los lectores de pantalla lo anuncian. */}
      <p className={`formact-aviso ${faltan.length === 0 ? 'formact-aviso--problema' : ''}`} id="formact-aviso" role="status">
        {textoAviso}
      </p>
      <button
        type="button"
        className="generarqr-generar-btn"
        aria-disabled={!puedeAvanzar}
        aria-describedby="formact-aviso"
        onClick={avanzar}
      >
        {paso < TOTAL_PASOS
          ? 'Siguiente'
          : guardando ? 'Guardando...' : (
            <>
              <Plus size={18} strokeWidth={2.2} aria-hidden="true" /> Crear actividad
            </>
          )}
      </button>
    </>
  );

  return (
    <PantallaFormulario titulo="Nueva actividad" paso={{ actual: paso, total: TOTAL_PASOS }} onVolver={volver} pie={pie}>
      <form
        className="generarqr-form"
        onSubmit={(e) => { e.preventDefault(); avanzar(); }}
        noValidate
      >
        <h2 className="formact-titulo-paso" ref={tituloPasoRef} tabIndex={-1}>{TITULOS[paso - 1]}</h2>

        {paso === 1 && (
          <>
            <label className="generarqr-campo">
              <span>Nombre</span>
              <input
                type="text"
                className="generarqr-input"
                placeholder="Ej. Degustación de café"
                maxLength={120}
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
              />
            </label>

            <div className="generarqr-campo">
              <span>Categoría</span>
              <div className="generarqr-pildoras" role="group" aria-label="Categoría de la actividad">
                {CATEGORIAS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className={`generarqr-pildora ${categoria === c.id ? 'activa' : ''}`}
                    aria-pressed={categoria === c.id}
                    onClick={() => {
                      setCategoria(categoria === c.id ? '' : c.id);
                      if (c.id !== 'otro') setCategoriaOtro('');
                    }}
                  >
                    {c.etiqueta}
                  </button>
                ))}
              </div>
            </div>
            {categoria === 'otro' && (
              <CampoOtro id="actividad-categoria-otro" value={categoriaOtro} onChange={setCategoriaOtro} claseInput="generarqr-input" placeholder="Ej. Danza, Feria de libros…" />
            )}

            <label className="generarqr-campo">
              <span>Descripción</span>
              <textarea
                className="generarqr-input generarqr-textarea"
                placeholder="¿De qué se trata?"
                maxLength={2000}
                rows={4}
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
              />
              <small className="generarqr-contador">
                {largo(descripcion.trim()) < MIN_DESCRIPCION
                  ? `Mínimo ${MIN_DESCRIPCION} caracteres · ${largo(descripcion.trim())}/${MIN_DESCRIPCION}`
                  : `${largo(descripcion)}/2000`}
              </small>
            </label>

            <div className="generarqr-campo">
              <span>Foto</span>
              <input
                ref={fotoInputRef}
                type="file"
                accept="image/*"
                onChange={handleFoto}
                className="generarqr-file-oculto"
                tabIndex={-1}
              />
              {fotoPrevia ? (
                <div className="generarqr-foto">
                  <img src={fotoPrevia} alt="Vista previa de la foto de la actividad" />
                  <button
                    type="button"
                    className="generarqr-foto-quitar"
                    onClick={() => setFoto(null)}
                    aria-label="Quitar la foto"
                  >
                    <X size={16} strokeWidth={2.4} aria-hidden="true" />
                  </button>
                </div>
              ) : (
                <button type="button" className="generarqr-foto-agregar" onClick={() => fotoInputRef.current?.click()}>
                  <ImagePlus size={20} strokeWidth={1.8} aria-hidden="true" /> Agregar una foto
                </button>
              )}
              <small className="generarqr-ayuda-foto">
                Mejor en horizontal (proporción 7:5, desde 1200 × 850 px), JPG o PNG, máximo {TAMANO_MAX_MB} MB.
                El recorte se ancla arriba: deja caras y lo importante en la parte de arriba de la foto.
              </small>
            </div>
          </>
        )}

        {paso === 2 && (
          <>
            <label className="generarqr-campo">
              <span>¿Qué día empieza?</span>
              <input
                type="date"
                className="generarqr-input"
                min={hoy}
                value={fechaInicio}
                onChange={(e) => cambiarFechaInicio(e.target.value)}
              />
              {fechaInicio && <small className="formact-escrita">Empieza el {fechaEscrita(fechaInicio)}</small>}
            </label>
            <label className="generarqr-campo">
              <span>¿Qué día termina?</span>
              <input
                type="date"
                className={`generarqr-input ${fechasDesordenadas ? 'generarqr-input--error' : ''}`}
                min={fechaInicio || hoy}
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
                aria-invalid={fechasDesordenadas}
              />
              {fechaFin && !fechasDesordenadas && <small className="formact-escrita">Termina el {fechaEscrita(fechaFin)}</small>}
            </label>

            <ControlHora id="hora-inicio" etiqueta="¿A qué hora empieza?" verbo="Empieza" value={horaInicio} onChange={setHoraInicio} onIncompleto={setHoraInicioIncompleta} />
            <ControlHora id="hora-fin" etiqueta="¿A qué hora termina?" verbo="Termina" value={horaFin} onChange={setHoraFin} onIncompleto={setHoraFinIncompleta} resumenCompleto={notaHoras} />

            <label className="generarqr-campo">
              <span>Lugar</span>
              <input
                type="text"
                className="generarqr-input"
                placeholder="Ej. Plazoleta Rubén Darío"
                maxLength={60}
                value={lugar}
                onChange={(e) => setLugar(e.target.value)}
              />
              <small className="generarqr-contador">{lugar.length}/60</small>
            </label>
          </>
        )}

        {paso === 3 && (
          <>
            <label className="generarqr-campo">
              <span>Eslogan <em>(opcional)</em></span>
              <input
                type="text"
                className="generarqr-input"
                placeholder="Ej. Tradición viva"
                maxLength={80}
                value={eslogan}
                onChange={(e) => setEslogan(e.target.value)}
              />
              <small className="generarqr-contador">{eslogan.length}/80</small>
            </label>

            <label className="generarqr-campo">
              <span>Detalles <em>(opcional)</em></span>
              <textarea
                className="generarqr-input generarqr-textarea"
                placeholder="Qué incluye, qué llevar, cómo llegar…"
                maxLength={1000}
                rows={4}
                value={detalles}
                onChange={(e) => setDetalles(e.target.value)}
              />
              <small className="generarqr-contador">{detalles.length}/1000</small>
            </label>

            <div className="generarqr-campo">
              <span>Etiquetas <em>(opcional)</em></span>
              {etiquetas.length > 0 && (
                <ul className="generarqr-chips" aria-label="Etiquetas agregadas">
                  {etiquetas.map((e, i) => (
                    <li key={e} className="generarqr-chip">
                      #{e}
                      <button type="button" onClick={() => quitarEtiqueta(i)} aria-label={`Quitar la etiqueta ${e}`}>
                        <X size={13} strokeWidth={2.6} aria-hidden="true" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <div className="generarqr-etiqueta-entrada">
                <input
                  type="text"
                  className="generarqr-input"
                  placeholder={etiquetas.length >= MAX_ETIQUETAS ? 'Llegaste al máximo de etiquetas' : 'Escribe y presiona Enter'}
                  maxLength={MAX_LARGO_ETIQUETA}
                  value={etiquetaTexto}
                  disabled={etiquetas.length >= MAX_ETIQUETAS}
                  onChange={(e) => { setEtiquetaTexto(e.target.value); setErrorEtiqueta(''); }}
                  onKeyDown={handleTeclaEtiqueta}
                />
                <button
                  type="button"
                  className="generarqr-accion"
                  onClick={agregarEtiqueta}
                  disabled={!etiquetaTexto.trim() || etiquetas.length >= MAX_ETIQUETAS}
                >
                  Agregar
                </button>
              </div>
              <small className={errorEtiqueta ? 'generarqr-ayuda--error' : 'generarqr-contador'}>
                {errorEtiqueta || `${etiquetas.length}/${MAX_ETIQUETAS} etiquetas · hasta ${MAX_LARGO_ETIQUETA} caracteres cada una`}
              </small>
            </div>

            <div className="generarqr-sello">
              <span id="generarqr-sello-etiqueta">¿Quieres un sello de negocio para esta actividad?</span>
              <button
                type="button"
                role="switch"
                aria-checked={quiereSello}
                aria-labelledby="generarqr-sello-etiqueta"
                className={`generarqr-switch ${quiereSello ? 'generarqr-switch--activo' : ''}`}
                onClick={() => setQuiereSello((v) => !v)}
              >
                <span className="generarqr-switch-perilla" />
              </button>
            </div>

            {quiereSello && (
              <label className="generarqr-campo generarqr-justificacion">
                <span>Cuéntanos para qué lo vas a usar</span>
                <textarea
                  className="generarqr-input generarqr-textarea"
                  placeholder="Ej. Los visitantes que prueben el café del día reciben el sello."
                  maxLength={2000}
                  rows={3}
                  value={justificacion}
                  onChange={(e) => setJustificacion(e.target.value)}
                />
                <small>Un administrador revisa la solicitud. Cuando la apruebe, el QR aparece aquí.</small>
              </label>
            )}

            {quiereSello && (
              <label className="generarqr-campo generarqr-limite">
                <span>¿Cuántos canjes quieres permitir?</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min="1"
                  max={MAX_CANJES}
                  step="1"
                  className={`generarqr-input ${limiteInvalido ? 'generarqr-input--error' : ''}`}
                  placeholder="Ej. 50"
                  value={limite}
                  onChange={(e) => setLimite(e.target.value)}
                  aria-invalid={limiteInvalido}
                />
                <small className={limiteInvalido ? 'generarqr-ayuda--error' : ''}>
                  {limiteInvalido ? mensajeLimite : `Cuántas personas pueden canjear el sello. Máximo ${MAX_CANJES}.`}
                </small>
              </label>
            )}

            <div className="generarqr-previa">
              <p className="generarqr-previa-titulo">Así se verá en la lista de Eventos</p>
              <TarjetaEvento
                vistaPrevia
                evento={{
                  nombre: nombre.trim(),
                  fechaInicio: fechaInicio || null,
                  fechaFin: fechaFin || null,
                  categoria,
                  categoriaOtro: categoriaOtro.trim(),
                  imagenUrl: fotoPrevia,
                  lugar: lugar.trim(),
                  organizador,
                }}
              />
              {!(fechaInicio && fechaFin) && (
                <p className="generarqr-previa-nota">Sin fechas, la actividad no aparece en Eventos.</p>
              )}
            </div>
          </>
        )}
      </form>
    </PantallaFormulario>
  );
}

export default FormularioActividad;
