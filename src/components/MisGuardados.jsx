import { useState } from 'react';
import TopBar from './TopBar';
import { useGuardados } from '../hooks/useGuardados';
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

function MisGuardados({ usuarioId, onVerSitio, onVolver }) {
  const { guardados, cargando } = useGuardados(usuarioId);
  const [pestanaActiva, setPestanaActiva] = useState('todos');

  const visibles = pestanaActiva === 'todos'
    ? guardados
    : guardados.filter((g) => g.tipo === pestanaActiva);

  const handleClick = (item) => {
    if (item.tipo === 'sitio') {
      onVerSitio?.(Number(item.referencia_id));
    }
    // Los demas tipos (ruta, negocio, evento, ubicacion) se conectan en pasos siguientes.
  };

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
            {visibles.map((item) => (
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
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default MisGuardados;
