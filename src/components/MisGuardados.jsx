import { useState } from 'react';
import TopBar from './TopBar';
import { useGuardados } from '../hooks/useGuardados';
import { hoyISO, rangoLargo } from '../utils/eventos';
import './MisGuardados.css';

const PESTANAS = [
  { id: 'todos', etiqueta: 'Todos' },
  { id: 'sitio', etiqueta: 'Sitios' },
  { id: 'ruta', etiqueta: 'Rutas' },
  { id: 'negocio', etiqueta: 'Negocios' },
  { id: 'evento', etiqueta: 'Eventos' },
  { id: 'ubicacion', etiqueta: 'Ubicaciones' },
];

const ETIQUETA_TIPO = {
  sitio: 'Sitio',
  ruta: 'Ruta',
  negocio: 'Negocio',
  evento: 'Evento',
  ubicacion: 'Ubicación',
};

const MENSAJE_VACIO = {
  todos: 'Aún no has guardado nada.',
  sitio: 'Aún no tienes sitios guardados.',
  ruta: 'Aún no tienes rutas guardadas.',
  negocio: 'Aún no tienes negocios guardados.',
  evento: 'Aún no tienes eventos guardados.',
  ubicacion: 'Aún no tienes ubicaciones guardadas.',
};

// eventos: la agenda actual (useEventosPublicos). onVerEvento(id) abre su detalle. Un evento guardado
// que ya no está en la agenda (terminó, o el negocio venció) se sigue mostrando con los datos
// que se guardaron, marcado como "Ya no está en la agenda".
function MisGuardados({ usuarioId, eventos = [], onVerSitio, onVerEvento, onVolver }) {
  const { guardados, cargando } = useGuardados(usuarioId);
  const [pestanaActiva, setPestanaActiva] = useState('todos');
  const [avisoId, setAvisoId] = useState(null); // evento sin detalle del que se mostró el aviso

  const visibles = pestanaActiva === 'todos'
    ? guardados
    : guardados.filter((g) => g.tipo === pestanaActiva);

  const handleClick = (item) => {
    if (item.tipo === 'sitio') {
      onVerSitio?.(Number(item.referencia_id));
    }
    if (item.tipo === 'evento') {
      if (eventos.some((e) => e.id === item.referencia_id)) onVerEvento?.(item.referencia_id);
      else setAvisoId(avisoId === item.referencia_id ? null : item.referencia_id);
    }
    // Los demas tipos (ruta, negocio, ubicacion) se conectan en pasos siguientes.
  };

  const hoy = hoyISO();

  return (
    <div className="guardados-wrapper">
      <TopBar title="Mis Guardados" onBack={onVolver} />

      <div className="guardados-pestanas">
        {PESTANAS.map((p) => (
          <button
            key={p.id}
            type="button"
            className={`guardados-pestana ${pestanaActiva === p.id ? 'activa' : ''}`}
            onClick={() => setPestanaActiva(p.id)}
          >
            {p.etiqueta}
          </button>
        ))}
      </div>

      <div className="guardados-contenido">
        {cargando ? (
          <p className="guardados-vacio">Cargando...</p>
        ) : visibles.length === 0 ? (
          <p className="guardados-vacio">{MENSAJE_VACIO[pestanaActiva]}</p>
        ) : (
          <ul className="guardados-lista">
            {visibles.map((item) => {
              if (item.tipo === 'evento') {
                // Datos al día si el evento sigue en la agenda; si no, los que se guardaron.
                const vivo = eventos.find((e) => e.id === item.referencia_id);
                const info = vivo || item.datos || {};
                const terminado = Boolean(info.fechaFin) && info.fechaFin < hoy;
                const fuera = !vivo;
                return (
                  <li key={`${item.tipo}-${item.referencia_id}`}>
                    <button
                      type="button"
                      className={`guardados-item guardados-item--evento ${fuera ? 'guardados-item--fuera' : ''}`}
                      onClick={() => handleClick(item)}
                    >
                      <span
                        className="guardados-evento-foto"
                        style={info.imagenUrl ? { backgroundImage: `url("${info.imagenUrl}")` } : undefined}
                        aria-hidden="true"
                      />
                      <span className="guardados-evento-texto">
                        <span className="guardados-item-nombre">{info.nombre || 'Sin nombre'}</span>
                        {info.fechaInicio && (
                          <span className="guardados-evento-detalle">{rangoLargo(info.fechaInicio, info.fechaFin)}</span>
                        )}
                        {info.lugar && <span className="guardados-evento-detalle">{info.lugar}</span>}
                        {fuera && (
                          <span className="guardados-evento-estado">
                            {terminado ? 'Ya terminó' : 'Ya no está en la agenda'}
                          </span>
                        )}
                      </span>
                      <span className="guardados-item-tipo">{ETIQUETA_TIPO[item.tipo]}</span>
                    </button>
                    {avisoId === item.referencia_id && (
                      <p className="guardados-aviso">Este evento ya no está en la agenda, así que no hay más detalles para mostrar.</p>
                    )}
                  </li>
                );
              }
              return (
                <li key={`${item.tipo}-${item.referencia_id}`}>
                  <button
                    type="button"
                    className="guardados-item"
                    onClick={() => handleClick(item)}
                  >
                    <span className="guardados-item-nombre">
                      {item.datos?.nombre || 'Sin nombre'}
                    </span>
                    <span className="guardados-item-tipo">{ETIQUETA_TIPO[item.tipo]}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

export default MisGuardados;
