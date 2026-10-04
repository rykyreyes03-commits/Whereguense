import { useEffect, useMemo, useRef, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { Trash2, Download, Printer, CalendarDays, Clock, CircleCheck, CircleX, Plus, Send, ImagePlus, X, Ticket, QrCode } from 'lucide-react';
import './GenerarQR.css';
import TopBar from './TopBar';
import CuponesNegocio from './CuponesNegocio';
import TarjetaEvento from './TarjetaEvento';
import ControlHora from './ControlHora';
import {
  CATEGORIAS,
  MAX_ETIQUETAS,
  MAX_LARGO_ETIQUETA,
  normalizarEtiqueta,
  claveEtiqueta,
  notaDiaSiguiente,
} from '../utils/eventos';

// Mismo límite de tamaño de foto que las fotos del negocio (PerfilNegocio).
const TAMANO_MAX_MB = 5;
// Máximo de canjes que se puede pedir para el sello de una actividad (026).
const MAX_CANJES = 200;

const ESTADOS_SELLO = {
  pendiente: { texto: 'Sello en revisión', Icono: Clock, clase: 'pendiente' },
  aprobado: { texto: 'Sello aprobado', Icono: CircleCheck, clase: 'aprobado' },
  rechazado: { texto: 'Sello rechazado', Icono: CircleX, clase: 'rechazado' },
};

function formatearFecha(fechaISO) {
  return new Date(`${fechaISO}T00:00:00`).toLocaleDateString('es-NI', { day: 'numeric', month: 'short', year: 'numeric' });
}

function textoFechas(actividad) {
  if (!actividad.fecha_inicio) return 'Sin fechas · no aparece en Eventos';
  if (actividad.fecha_inicio === actividad.fecha_fin) return formatearFecha(actividad.fecha_inicio);
  return `${formatearFecha(actividad.fecha_inicio)} – ${formatearFecha(actividad.fecha_fin)}`;
}

// Formulario y lista de actividades del negocio (pestaña "Actividades" de PerfilNegocio).
// Una actividad puede pedir un sello: el admin lo aprueba y recién ahí existe el QR.
// Los QR creados antes de las actividades (crear_actividad_qr) se listan aparte.
// embebido: se dibuja dentro de la pestaña (sin barra superior ni pantalla completa).
function GenerarQR({
  actividades = [],
  actividadesQR = [],
  onRecargar,
  onCrearActividad,
  onReenviarSello,
  onEliminarActividad,
  onNavigate,
  negocioId,
  organizador = null, // { nombre, logoUrl }: sale en la vista previa de la tarjeta
  embebido = false,
}) {
  const areaRef = useRef(null);
  const fotoInputRef = useRef(null);
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [categoria, setCategoria] = useState('');
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
  const [expandidoId, setExpandidoId] = useState(null);
  // Reenvío de un sello rechazado: una actividad a la vez.
  const [reenvio, setReenvio] = useState(null); // { id, original, texto }
  const [reenviando, setReenviando] = useState(false);

  // Vista previa de la foto elegida (se libera al cambiarla o al salir).
  const fotoPrevia = useMemo(() => (foto ? URL.createObjectURL(foto) : null), [foto]);
  useEffect(() => () => {
    if (fotoPrevia) URL.revokeObjectURL(fotoPrevia);
  }, [fotoPrevia]);

  // Al abrir la pestaña: traer de nuevo, por si el admin aprobó o rechazó algo.
  useEffect(() => {
    onRecargar?.();
  }, [onRecargar]);

  const qrPorId = new Map(actividadesQR.map((qr) => [qr.id, qr]));
  const idsConActividad = new Set(actividades.map((a) => a.qr_sello_id).filter(Boolean));
  const sellosAnteriores = actividadesQR.filter((qr) => !idsConActividad.has(qr.id));

  const hoy = new Date().toISOString().slice(0, 10);
  const soloUnaFecha = Boolean(fechaInicio) !== Boolean(fechaFin);
  const fechasDesordenadas = fechaInicio && fechaFin && fechaFin < fechaInicio;
  const faltaJustificacion = quiereSello && !justificacion.trim();
  // Límite de canjes: vacío = sin límite. Solo cuenta si pide sello.
  const limiteNum = limite.trim() === '' ? null : Number(limite);
  const limiteInvalido = quiereSello && limiteNum !== null
    && (!Number.isInteger(limiteNum) || limiteNum < 1 || limiteNum > MAX_CANJES);
  const mensajeLimite = limiteNum !== null && limiteNum > MAX_CANJES
    ? `El máximo es ${MAX_CANJES} canjes.`
    : 'Escribe un número entero de 1 en adelante.';
  // Las horas van juntas (las dos o ninguna); no se exige orden: un evento nocturno termina "antes".
  const horaIncompleta = horaInicioIncompleta || horaFinIncompleta;
  const soloUnaHora = Boolean(horaInicio) !== Boolean(horaFin) || horaIncompleta;
  const puedeEnviar = nombre.trim() && !soloUnaFecha && !fechasDesordenadas && !soloUnaHora
    && !faltaJustificacion && !limiteInvalido && !guardando;

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

  const limpiarFormulario = () => {
    setNombre('');
    setDescripcion('');
    setFechaInicio('');
    setFechaFin('');
    setQuiereSello(false);
    setJustificacion('');
    setLimite('');
    setFoto(null);
    setCategoria('');
    setLugar('');
    setHoraInicio('');
    setHoraFin('');
    setHoraInicioIncompleta(false);
    setHoraFinIncompleta(false);
    setEslogan('');
    setDetalles('');
    setEtiquetas([]);
    setEtiquetaTexto('');
    setErrorEtiqueta('');
  };

  const handleCrear = async (e) => {
    e.preventDefault();
    if (!puedeEnviar) return;

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
    const resultado = await onCrearActividad({
      nombre: nombre.trim(),
      descripcion: descripcion.trim(),
      fechaInicio: fechaInicio || null,
      fechaFin: fechaFin || null,
      solicitaSello: quiereSello,
      justificacion: justificacion.trim(),
      limiteCanjes: quiereSello ? limiteNum : null,
      foto,
      categoria: categoria || null,
      lugar: lugar.trim() || null,
      horaInicio: horaInicio || null,
      horaFin: horaFin || null,
      eslogan: eslogan.trim() || null,
      detalles: detalles.trim() || null,
      etiquetas: etiquetasFinal.length > 0 ? etiquetasFinal : null,
    });
    setGuardando(false);

    if (!resultado.exito) {
      window.alert(resultado.mensaje);
      return;
    }
    if (resultado.aviso) window.alert(resultado.aviso);
    limpiarFormulario();
  };

  const handleReenviar = async (e) => {
    e.preventDefault();
    const texto = reenvio.texto.trim();
    if (!texto || texto === reenvio.original.trim()) return;

    setReenviando(true);
    const resultado = await onReenviarSello(reenvio.id, texto);
    setReenviando(false);

    if (!resultado.exito) {
      window.alert(resultado.mensaje);
      return;
    }
    setReenvio(null);
  };

  const handleEliminar = async (id) => {
    const resultado = await onEliminarActividad(id);
    if (!resultado.exito) {
      window.alert(resultado.mensaje);
      return;
    }
    if (expandidoId === id) setExpandidoId(null);
  };

  const handleDescargar = (nombreArchivo) => {
    const canvas = areaRef.current?.querySelector('canvas');
    if (!canvas) return;
    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    link.download = `sello-qr-${nombreArchivo}.png`;
    link.click();
  };

  // QR desplegable (mismo para sellos aprobados y sellos anteriores)
  const renderQR = (qr, nombreArchivo) => (
    <>
      <div className="generarqr-qr-area" ref={areaRef}>
        <QRCodeCanvas value={`WHEREGUENSE-QR:${qr.token}`} size={200} fgColor={qr.color} level="M" includeMargin />
      </div>
      <div className="generarqr-acciones">
        <button className="generarqr-accion" onClick={() => handleDescargar(nombreArchivo)} type="button">
          <Download size={16} strokeWidth={2} aria-hidden="true" /> Descargar
        </button>
        <button className="generarqr-accion" onClick={() => window.print()} type="button">
          <Printer size={16} strokeWidth={2} aria-hidden="true" /> Imprimir
        </button>
      </div>
    </>
  );

  // Dos bloques con identidad propia: Actividades (con sus sellos) y Cupones.
  const contenido = (
    <>
    <section className="generarqr-bloque generarqr-bloque--actividades" aria-labelledby="generarqr-actividades-titulo">
      <header className="generarqr-bloque-encabezado">
        <span className="generarqr-bloque-icono" aria-hidden="true"><QrCode size={22} strokeWidth={1.8} /></span>
        <div>
          <h2 className="generarqr-bloque-titulo" id="generarqr-actividades-titulo">Actividades</h2>
          <p className="generarqr-bloque-sub">Publícalas en Eventos y, si quieres, pide un sello para el pasaporte</p>
        </div>
      </header>

      {actividades.length > 0 ? (
        <div className="generarqr-lista">
          {actividades.map((actividad) => {
            const estado = ESTADOS_SELLO[actividad.estado_sello];
            const qr = actividad.qr_sello_id ? qrPorId.get(actividad.qr_sello_id) : null;
            const clave = `actividad-${actividad.id}`;
            const expandido = expandidoId === clave;
            return (
              <div key={clave} className="generarqr-item">
                {actividad.foto_url && (
                  <img className="generarqr-item-foto" src={actividad.foto_url} alt="" loading="lazy" />
                )}
                <div className="generarqr-item-info">
                  <strong>{actividad.nombre}</strong>
                  <span className="generarqr-item-fechas">
                    <CalendarDays size={14} strokeWidth={2} aria-hidden="true" /> {textoFechas(actividad)}
                  </span>
                  {actividad.descripcion && <p className="generarqr-item-desc">{actividad.descripcion}</p>}
                  {actividad.solicita_sello && (
                    <span className="generarqr-item-fechas">
                      <Ticket size={14} strokeWidth={2} aria-hidden="true" />
                      {actividad.limite_canjes ? `Límite: ${actividad.limite_canjes} canjes` : 'Sin límite de canjes'}
                    </span>
                  )}
                </div>

                {estado && (
                  <span className={`generarqr-estado generarqr-estado--${estado.clase}`}>
                    <estado.Icono size={14} strokeWidth={2.2} aria-hidden="true" /> {estado.texto}
                  </span>
                )}
                {actividad.estado_sello === 'rechazado' && actividad.motivo_rechazo_sello && (
                  <p className="generarqr-motivo">Motivo: {actividad.motivo_rechazo_sello}</p>
                )}

                {actividad.estado_sello === 'rechazado' && reenvio?.id !== actividad.id && (
                  <div className="generarqr-item-acciones">
                    <button
                      type="button"
                      className="generarqr-accion"
                      onClick={() => setReenvio({
                        id: actividad.id,
                        original: actividad.justificacion_sello || '',
                        texto: actividad.justificacion_sello || '',
                      })}
                    >
                      Editar y volver a enviar
                    </button>
                  </div>
                )}

                {reenvio?.id === actividad.id && (() => {
                  const sinCambios = reenvio.texto.trim() === reenvio.original.trim();
                  return (
                    <form className="generarqr-reenvio" onSubmit={handleReenviar} noValidate>
                      <label className="generarqr-campo">
                        <span>Cuéntanos para qué lo vas a usar</span>
                        <textarea
                          className="generarqr-input generarqr-textarea"
                          maxLength={2000}
                          rows={4}
                          value={reenvio.texto}
                          onChange={(e) => setReenvio({ ...reenvio, texto: e.target.value })}
                          autoFocus
                        />
                        <small>
                          {sinCambios
                            ? 'Corrige la explicación según el motivo del rechazo para poder enviarla.'
                            : 'Se enviará de nuevo al administrador para su revisión.'}
                        </small>
                      </label>
                      <div className="generarqr-acciones">
                        <button
                          type="button"
                          className="generarqr-accion"
                          onClick={() => setReenvio(null)}
                          disabled={reenviando}
                        >
                          Cancelar
                        </button>
                        <button
                          type="submit"
                          className="generarqr-accion generarqr-accion--primaria"
                          disabled={reenviando || sinCambios || !reenvio.texto.trim()}
                        >
                          <Send size={16} strokeWidth={2} aria-hidden="true" /> {reenviando ? 'Enviando...' : 'Volver a enviar'}
                        </button>
                      </div>
                    </form>
                  );
                })()}

                {qr && (
                  <div className="generarqr-item-acciones">
                    <button
                      type="button"
                      className="generarqr-accion"
                      onClick={() => setExpandidoId(expandido ? null : clave)}
                    >
                      {expandido ? 'Ocultar QR' : 'Ver QR'}
                    </button>
                  </div>
                )}
                {qr && expandido && renderQR(qr, actividad.nombre)}
              </div>
            );
          })}
        </div>
      ) : (
        <p className="generarqr-vacio">Aún no tienes actividades. Crea la primera abajo.</p>
      )}

      {sellosAnteriores.length > 0 && (
        <>
          <h2 className="generarqr-subtitulo">Sellos anteriores</h2>
          <div className="generarqr-lista">
            {sellosAnteriores.map((qr) => {
              const clave = `qr-${qr.id}`;
              const expandido = expandidoId === clave;
              return (
                <div key={clave} className="generarqr-item">
                  <div className="generarqr-item-info">
                    <strong>{qr.nombre_actividad}</strong>
                    <span>{qr.limite_canjes ? `Límite: ${qr.limite_canjes} canjes` : 'Sin límite de canjes'}</span>
                    {qr.fecha_expiracion && (
                      <span>Vence: {new Date(qr.fecha_expiracion).toLocaleDateString('es-NI')}</span>
                    )}
                  </div>
                  <div className="generarqr-item-acciones">
                    <button
                      type="button"
                      className="generarqr-accion"
                      onClick={() => setExpandidoId(expandido ? null : clave)}
                    >
                      {expandido ? 'Ocultar QR' : 'Ver QR'}
                    </button>
                    <button
                      type="button"
                      className="generarqr-item-eliminar"
                      onClick={() => handleEliminar(qr.id)}
                      aria-label={`Eliminar ${qr.nombre_actividad}`}
                    >
                      <Trash2 size={18} strokeWidth={1.8} aria-hidden="true" />
                    </button>
                  </div>
                  {expandido && renderQR(qr, qr.nombre_actividad)}
                </div>
              );
            })}
          </div>
        </>
      )}

      <form className="generarqr-form" onSubmit={handleCrear} noValidate>
        <h2 className="generarqr-subtitulo">Nueva actividad</h2>

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
          <span>Categoría <em>(opcional)</em></span>
          <div className="generarqr-pildoras" role="group" aria-label="Categoría de la actividad">
            {CATEGORIAS.map((c) => (
              <button
                key={c.id}
                type="button"
                className={`generarqr-pildora ${categoria === c.id ? 'activa' : ''}`}
                aria-pressed={categoria === c.id}
                onClick={() => setCategoria(categoria === c.id ? '' : c.id)}
              >
                {c.etiqueta}
              </button>
            ))}
          </div>
        </div>

        <label className="generarqr-campo">
          <span>Descripción <em>(opcional)</em></span>
          <textarea
            className="generarqr-input generarqr-textarea"
            placeholder="¿De qué se trata?"
            maxLength={2000}
            rows={3}
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
          />
        </label>

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
          <span>Foto <em>(opcional)</em></span>
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

        <label className="generarqr-campo">
          <span>Lugar <em>(opcional)</em></span>
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

        <div className="generarqr-fechas">
          <label className="generarqr-campo">
            <span>Inicio</span>
            <input
              type="date"
              className="generarqr-input"
              min={hoy}
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
            />
          </label>
          <label className="generarqr-campo">
            <span>Fin</span>
            <input
              type="date"
              className="generarqr-input"
              min={fechaInicio || hoy}
              value={fechaFin}
              onChange={(e) => setFechaFin(e.target.value)}
            />
          </label>
        </div>
        <p className={`generarqr-ayuda ${soloUnaFecha || fechasDesordenadas ? 'generarqr-ayuda--error' : ''}`}>
          {fechasDesordenadas
            ? 'La fecha de fin no puede ser anterior a la de inicio.'
            : soloUnaFecha
              ? 'Completa las dos fechas, o deja ambas vacías.'
              : 'Opcional. Con fechas, la actividad aparece en Eventos y en tu ficha pública.'}
        </p>

        <ControlHora id="hora-inicio" etiqueta="¿A qué hora empieza?" verbo="Empieza" value={horaInicio} onChange={setHoraInicio} onIncompleto={setHoraInicioIncompleta} />
        <ControlHora id="hora-fin" etiqueta="¿A qué hora termina?" verbo="Termina" value={horaFin} onChange={setHoraFin} onIncompleto={setHoraFinIncompleta} />
        <p className={`generarqr-ayuda ${soloUnaHora ? 'generarqr-ayuda--error' : ''}`}>
          {soloUnaHora
            ? (horaIncompleta ? 'Falta elegir la hora o AM/PM.' : 'Completa las dos horas, o deja ambas vacías.')
            : notaDiaSiguiente(horaInicio, horaFin) || 'Opcional. Si termina de madrugada, elige la hora de fin del día siguiente.'}
        </p>

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
            <span>¿Cuántos canjes quieres permitir? <em>(opcional)</em></span>
            <input
              type="number"
              inputMode="numeric"
              min="1"
              max={MAX_CANJES}
              step="1"
              className={`generarqr-input ${limiteInvalido ? 'generarqr-input--error' : ''}`}
              placeholder="Sin límite"
              value={limite}
              onChange={(e) => setLimite(e.target.value)}
              aria-invalid={limiteInvalido}
            />
            <small className={limiteInvalido ? 'generarqr-ayuda--error' : ''}>
              {limiteInvalido ? mensajeLimite : `Déjalo vacío para no poner límite. Máximo ${MAX_CANJES}.`}
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
              imagenUrl: fotoPrevia,
              lugar: lugar.trim(),
              organizador,
            }}
          />
          {!(fechaInicio && fechaFin) && (
            <p className="generarqr-previa-nota">Sin fechas, la actividad no aparece en Eventos.</p>
          )}
        </div>

        <button className="generarqr-generar-btn" disabled={!puedeEnviar} type="submit">
          {guardando ? 'Guardando...' : (
            <>
              <Plus size={18} strokeWidth={2.2} aria-hidden="true" /> Crear actividad
            </>
          )}
        </button>
      </form>
    </section>

    {/* Cupones (027): bloque propio, separado de los sellos */}
    {negocioId && <CuponesNegocio negocioId={negocioId} />}
    </>
  );

  if (embebido) return contenido;

  return (
    <div className="generarqr-wrapper">
      <TopBar title="Actividades y cupones" onBack={() => onNavigate('perfilNegocio')} />
      <div className="generarqr-bloques">{contenido}</div>
    </div>
  );
}

export default GenerarQR;
