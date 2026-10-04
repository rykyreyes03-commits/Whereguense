import { useState } from 'react';
import { CalendarDays, MapPin } from 'lucide-react';
import './TarjetaEvento.css';
import AvatarOrganizador from './AvatarOrganizador';
import { textoCategoria, rangoCorto, rangoLargo } from '../utils/eventos';

// Tarjeta de la lista de eventos: foto arriba con la fecha a la izquierda y la categoría a la
// derecha, título, organizador (o lugar) y el rango de fechas con "Ver →". Sin foto: fondo navy
// con degradado. Los campos vacíos no se dibujan.
//   evento: { nombre, fechaInicio, fechaFin, categoria, categoriaOtro, imagenUrl, lugar, organizador: { nombre, logoUrl } }
//   vistaPrevia: la misma tarjeta sin acción, para el formulario de actividad.
function TarjetaEvento({ evento, onAbrir, vistaPrevia = false }) {
  const [fotoFallida, setFotoFallida] = useState(null);
  const foto = evento.imagenUrl && fotoFallida !== evento.imagenUrl ? evento.imagenUrl : null;
  const categoria = textoCategoria(evento.categoria, evento.categoriaOtro);
  const pillFecha = rangoCorto(evento.fechaInicio, evento.fechaFin);
  const fechas = rangoLargo(evento.fechaInicio, evento.fechaFin);
  const organizador = evento.organizador?.nombre ? evento.organizador : null;

  const cuerpo = (
    <>
      <div className={`tev-media ${foto ? '' : 'tev-media--sin-foto'}`}>
        {foto && (
          <img
            className="tev-foto"
            src={foto}
            alt=""
            loading="lazy"
            onError={() => setFotoFallida(evento.imagenUrl)}
          />
        )}
        {pillFecha && <span className="tev-pill tev-pill--fecha">{pillFecha}</span>}
        {categoria && <span className="tev-pill tev-pill--categoria">{categoria}</span>}
      </div>

      <div className="tev-cuerpo">
        <h3 className="tev-titulo">{evento.nombre || 'Nombre de tu actividad'}</h3>

        {organizador ? (
          <div className="tev-organizador">
            <AvatarOrganizador nombre={organizador.nombre} logoUrl={organizador.logoUrl} tamano={24} />
            <span className="tev-organizador-nombre">{organizador.nombre}</span>
          </div>
        ) : (
          evento.lugar && (
            <div className="tev-organizador tev-organizador--lugar">
              <MapPin size={15} strokeWidth={2} aria-hidden="true" />
              <span className="tev-organizador-nombre">{evento.lugar}</span>
            </div>
          )
        )}

        <div className="tev-pie">
          <span className="tev-fechas">
            <CalendarDays size={15} strokeWidth={2} aria-hidden="true" />
            {fechas || 'Sin fechas'}
          </span>
          <span className="tev-ver">Ver →</span>
        </div>
      </div>
    </>
  );

  if (vistaPrevia) {
    return <article className="tev tev--previa" aria-label="Vista previa de la tarjeta">{cuerpo}</article>;
  }

  return (
    <article
      className="tev"
      role="button"
      tabIndex={0}
      onClick={() => onAbrir?.(evento.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onAbrir?.(evento.id);
        }
      }}
    >
      {cuerpo}
    </article>
  );
}

export default TarjetaEvento;
