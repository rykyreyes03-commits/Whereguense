import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Share2, Heart, CalendarDays, MapPin, Clock, Stamp } from 'lucide-react';
import './DetalleEvento.css';
import AvatarOrganizador from './AvatarOrganizador';
import PerfilNegocioPublico from './PerfilNegocioPublico';
import LineaResenas from './LineaResenas';
import { textoCategoria, rangoCorto, rangoConAnio, rangoHoras, notaDiaSiguiente, eventoTermino } from '../utils/eventos';
import { useAhora } from '../hooks/useAhora';
import { compartirEvento } from '../utils/compartir';
import { useGuardados } from '../hooks/useGuardados';

// Detalle de un evento o actividad: foto grande con el nombre encima, recuadros de fecha / lugar /
// hora, organizador, descripción y etiquetas. Lo que no tiene valor no se dibuja.
//   usuarioId: para guardar el evento en favoritos (tipo 'evento', id con prefijo del frontend).
//   volverA: pantalla a la que lleva "Volver" (por defecto la agenda; Mis guardados la cambia).
//   modoDuenio: la misma pantalla sin los botones del turista (volver, compartir, favorito, ver perfil); la usa el
//   dueño del negocio para ver su actividad tal como se publica.
function DetalleEvento({ evento, onNavigate, usuarioId, volverA = 'eventos', modoDuenio = false, onVerNegocioEnMapa = null }) {
  // URL de portada que falló al cargar: el encabezado vuelve a navy con degradado, sin foto.
  const [portadaFallida, setPortadaFallida] = useState(null);
  const [verPerfil, setVerPerfil] = useState(false);
  const [aviso, setAviso] = useState('');
  const ahora = useAhora(); // si el evento termina con el detalle abierto, aparece "Ya terminó" sin recargar
  const temporizadorAviso = useRef(null);
  const { estaGuardado, toggleGuardar } = useGuardados(usuarioId);

  useEffect(() => () => clearTimeout(temporizadorAviso.current), []);

  const mostrarAviso = (texto) => {
    setAviso(texto);
    clearTimeout(temporizadorAviso.current);
    temporizadorAviso.current = setTimeout(() => setAviso(''), 1800);
  };

  // Favorito: referencia_id = el id con prefijo (actividad-<id> o evento-<id>), nunca el número de
  // la tabla: la actividad 32 tiene una copia en evento (id 12) que la agenda excluye a propósito.
  // Se guarda una copia de los datos para que no desaparezca de Mis guardados cuando el evento
  // termine o el negocio venza.
  const guardado = Boolean(evento) && estaGuardado('evento', evento.id);
  const handleFavorito = async () => {
    const resultado = await toggleGuardar('evento', evento.id, {
      nombre: evento.nombre,
      fechaInicio: evento.fechaInicio,
      fechaFin: evento.fechaFin,
      lugar: evento.lugar || '',
      imagenUrl: evento.imagenUrl || null,
      categoria: evento.categoria || null,
      horaInicio: evento.horaInicio || null, // con las horas guardadas se sabe cuándo termina (si no, al final del día)
      horaFin: evento.horaFin || null,
      organizador: evento.organizador?.nombre || null,
    });
    if (!resultado.exito) mostrarAviso(resultado.mensaje);
    else mostrarAviso(resultado.guardado ? 'Guardado en favoritos' : 'Quitado de favoritos');
  };

  // navigator.share si existe; si no, copia el texto y avisa "Copiado".
  const handleCompartir = async () => {
    const resultado = await compartirEvento(evento);
    if (resultado === 'copiado') mostrarAviso('Copiado');
    else if (resultado === 'error') mostrarAviso('No se pudo copiar');
  };

  if (!evento) {
    return (
      <div className="detalle-evento-wrapper">
        <div className="detalle-evento-vacio">
          <p>Evento no encontrado.</p>
          <button className="detalle-evento-btn" onClick={() => onNavigate?.(volverA)} type="button">
            ← Volver a eventos
          </button>
        </div>
      </div>
    );
  }

  const terminado = eventoTermino(evento, ahora);
  const foto = evento.imagenUrl && portadaFallida !== evento.imagenUrl ? evento.imagenUrl : null;
  // La pastilla dorada lleva solo la categoría (con el texto de "Otro"), nunca el lugar: el lugar ya tiene su recuadro.
  const pastilla = textoCategoria(evento.categoria, evento.categoriaOtro) || '';
  const subtitulo = [rangoConAnio(evento.fechaInicio, evento.fechaFin), evento.eslogan].filter(Boolean).join(' · ');
  const horas = rangoHoras(evento.horaInicio, evento.horaFin);
  const notaHoras = notaDiaSiguiente(evento.horaInicio, evento.horaFin);
  const organizador = evento.organizador?.nombre ? evento.organizador : null;
  const etiquetas = evento.etiquetas || [];

  const datos = [
    { id: 'fecha', etiqueta: 'Fecha', valor: rangoCorto(evento.fechaInicio, evento.fechaFin), Icono: CalendarDays, tono: 'azul' },
    { id: 'lugar', etiqueta: 'Lugar', valor: evento.lugar, Icono: MapPin, tono: 'rosa' },
    { id: 'hora', etiqueta: 'Hora', valor: horas, Icono: Clock, tono: 'rosa' },
  ].filter((d) => d.valor);

  const hayDescripcion = Boolean(evento.descripcion || evento.detalles || etiquetas.length > 0);

  return (
    <div className={`detalle-evento-wrapper ${modoDuenio ? 'detalle-evento-wrapper--duenio' : ''}`}>
      <header className={`detalle-evento-hero ${foto ? '' : 'detalle-evento-hero--sin-foto'}`}>
        {foto && (
          <img
            className="detalle-evento-portada"
            src={foto}
            alt=""
            onError={() => setPortadaFallida(evento.imagenUrl)}
          />
        )}

        {!modoDuenio && (
        <div className="detalle-evento-acciones">
          <button type="button" className="detalle-evento-volver" onClick={() => onNavigate?.(volverA)}>
            <ArrowLeft size={16} strokeWidth={2.4} aria-hidden="true" /> Volver
          </button>
          <div className="detalle-evento-acciones-der">
            <button
              type="button"
              className="detalle-evento-circulo"
              onClick={handleCompartir}
              aria-label="Compartir este evento"
            >
              <Share2 size={18} strokeWidth={2.2} aria-hidden="true" />
            </button>
            <button
              type="button"
              className={`detalle-evento-circulo detalle-evento-circulo--favorito ${guardado ? 'activo' : ''}`}
              onClick={handleFavorito}
              aria-label={guardado ? 'Quitar de favoritos' : 'Guardar en favoritos'}
              aria-pressed={guardado}
            >
              <Heart size={18} strokeWidth={2.2} fill={guardado ? 'currentColor' : 'none'} aria-hidden="true" />
            </button>
          </div>
        </div>
        )}

        <div className="detalle-evento-hero-texto">
          {terminado && <span className="detalle-evento-terminado">Ya terminó</span>}
          {pastilla && <span className="detalle-evento-pastilla">{pastilla}</span>}
          <h1>{evento.nombre}</h1>
          {subtitulo && <p className="detalle-evento-subtitulo">{subtitulo}</p>}
        </div>
      </header>

      <div className="detalle-evento-contenido">
        {datos.length > 0 && (
          <div className="detalle-evento-datos" style={{ '--columnas': datos.length }}>
            {datos.map(({ id, etiqueta, valor, Icono, tono }) => (
              <div key={id} className="detalle-evento-dato">
                <span className={`detalle-evento-dato-icono detalle-evento-dato-icono--${tono}`} aria-hidden="true">
                  <Icono size={18} strokeWidth={2} />
                </span>
                <span className="detalle-evento-dato-etiqueta">{etiqueta}</span>
                <strong className="detalle-evento-dato-valor">{valor}</strong>
              </div>
            ))}
          </div>
        )}
        {notaHoras && <p className="detalle-evento-nota-horas">{notaHoras}</p>}

        {organizador && (
          <section className="detalle-evento-tarjeta">
            <h2 className="detalle-evento-titulo-seccion">Organiza</h2>
            <div className="detalle-evento-organizador">
              <AvatarOrganizador nombre={organizador.nombre} logoUrl={organizador.logoUrl} tamano={46} />
              <div className="detalle-evento-organizador-texto">
                <strong>{organizador.nombre}</strong>
                {organizador.verificado && (
                  <span className="detalle-evento-verificado">
                    <i aria-hidden="true" /> Organizador verificado
                  </span>
                )}
                {organizador.id != null && <LineaResenas negocioId={organizador.id} />}
              </div>
              {!modoDuenio && organizador.id != null && (
                <button type="button" className="detalle-evento-perfil" onClick={() => setVerPerfil(true)}>
                  Ver perfil
                </button>
              )}
            </div>
          </section>
        )}

        {evento.sitioRelacionado && (
          <section className="detalle-evento-tarjeta">
            <h2 className="detalle-evento-titulo-seccion">Sitio relacionado</h2>
            <p className="detalle-evento-parrafo">{evento.sitioRelacionado}</p>
          </section>
        )}

        {hayDescripcion && (
          <section className="detalle-evento-tarjeta">
            <h2 className="detalle-evento-titulo-seccion">Descripción</h2>
            {evento.descripcion && <p className="detalle-evento-parrafo">{evento.descripcion}</p>}
            {evento.detalles && <p className="detalle-evento-parrafo detalle-evento-parrafo--suave">{evento.detalles}</p>}
            {etiquetas.length > 0 && (
              <ul className="detalle-evento-etiquetas" aria-label="Etiquetas">
                {etiquetas.map((e) => (
                  <li key={e}>#{e}</li>
                ))}
              </ul>
            )}
          </section>
        )}

        {evento.tieneSello && !terminado && (
          <section className="detalle-evento-tarjeta detalle-evento-sello">
            <Stamp size={22} strokeWidth={1.8} aria-hidden="true" />
            <p>Esta actividad entrega un sello: escanea el QR en el negocio.</p>
          </section>
        )}
      </div>

      {aviso && <div className="detalle-evento-aviso" role="status" aria-live="polite">{aviso}</div>}

      {verPerfil && organizador && (
        <PerfilNegocioPublico
          negocio={{
            id: organizador.id,
            name: organizador.nombre,
            categoria: organizador.categoria,
            descripcion: organizador.descripcion,
            telefono: organizador.telefono,
          }}
          onCerrar={() => setVerPerfil(false)}
          onVerEnMapa={onVerNegocioEnMapa}
        />
      )}
    </div>
  );
}

export default DetalleEvento;
