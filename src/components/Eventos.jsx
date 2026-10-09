import { useEffect, useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import './Eventos.css';
import TopBar from './TopBar';
import BottomNav from './BottomNav';
import TarjetaEvento from './TarjetaEvento';
import { CATEGORIAS, etiquetaCategoria, hoyManagua, eventoTermino, diaDeFin, sumarDias } from '../utils/eventos';
import { useAhora } from '../hooks/useAhora';

// Para buscar sin que importen mayúsculas ni tildes.
function plano(texto) {
  return String(texto || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

function coincideBusqueda(evento, consulta) {
  if (!consulta) return true;
  const pajar = plano([
    evento.nombre,
    evento.organizador?.nombre,
    evento.lugar,
    evento.eslogan,
    etiquetaCategoria(evento.categoria),
    evento.categoriaOtro,
    ...(evento.etiquetas || []),
  ].filter(Boolean).join(' '));
  return plano(consulta).split(/\s+/).filter(Boolean).every((palabra) => pajar.includes(palabra));
}

// Mensaje de la lista vacía: nombra el mismo filtro que marca la píldora activa.
function mensajeSinResultados(t, filtro, busqueda) {
  const consulta = busqueda.trim();
  const variante = filtro === 'hoy' ? 'Hoy' : filtro === 'semana' ? 'Semana' : filtro === 'todos' ? 'Todos' : 'Categoria';
  const categoria = variante === 'Categoria' ? etiquetaCategoria(filtro) : '';
  return consulta
    ? t(`eventos.hallazgo${variante}`, { q: consulta, categoria })
    : t(`eventos.vacio${variante}`, { categoria });
}

// Agenda: cabecera con la cantidad, buscador, filtros (Todos / Hoy / Esta semana / categorías)
// y las tarjetas. Los eventos que ya terminaron no se muestran.
function Eventos({ eventos, cargando, onRecargar, onNavigate, onSeleccionarEvento }) {
  const { t } = useTranslation();
  const [busqueda, setBusqueda] = useState('');
  const [filtro, setFiltro] = useState('todos'); // 'todos' | 'hoy' | 'semana' | id de categoría

  // Al entrar: traer de nuevo (actividades recién creadas por los negocios).
  useEffect(() => {
    onRecargar?.();
  }, [onRecargar]);

  // Cada minuto se vuelve a evaluar qué terminó: lo terminado no aparece en la lista, ni en la búsqueda, ni en los filtros.
  const ahora = useAhora();
  const hoy = hoyManagua(ahora);
  const agenda = useMemo(
    () => eventos
      .filter((e) => !eventoTermino(e, ahora))
      .sort((a, b) => a.fechaInicio.localeCompare(b.fechaInicio)),
    [eventos, ahora]
  );

  // Categorías que realmente tienen eventos, en el orden de siempre.
  const categoriasPresentes = CATEGORIAS.filter((c) => agenda.some((e) => e.categoria === c.id));

  // Si la categoría elegida ya no tiene eventos (se recargó la agenda, o venció el último), su píldora
  // desaparece: se vuelve a "Todos" para que la píldora activa y la lista siempre coincidan.
  const filtroActivo = filtro === 'todos' || filtro === 'hoy' || filtro === 'semana'
    || categoriasPresentes.some((c) => c.id === filtro)
    ? filtro
    : 'todos';

  const visibles = agenda.filter((e) => {
    if (filtroActivo === 'hoy' && !(e.fechaInicio <= hoy && hoy <= diaDeFin(e))) return false;
    if (filtroActivo === 'semana' && !(e.fechaInicio <= sumarDias(hoy, 6) && diaDeFin(e) >= hoy)) return false;
    if (filtroActivo !== 'todos' && filtroActivo !== 'hoy' && filtroActivo !== 'semana' && e.categoria !== filtroActivo) return false;
    return coincideBusqueda(e, busqueda);
  });

  const handleSeleccionar = (eventoId) => {
    onSeleccionarEvento?.(eventoId);
    onNavigate?.('detalleEvento');
  };

  const filtros = [
    { id: 'todos', etiqueta: t('eventos.todos') },
    { id: 'hoy', etiqueta: t('eventos.hoy') },
    { id: 'semana', etiqueta: t('eventos.semana') },
    ...categoriasPresentes.map((c) => ({ id: c.id, etiqueta: etiquetaCategoria(c.id) })),
  ];
  const hayFiltros = filtroActivo !== 'todos' || busqueda.trim() !== '';

  return (
    <div className="eventos-wrapper">
      <TopBar onMenuClick={() => onNavigate?.('menu')}>
        <p className="eventos-eyebrow">NICARAGUA · {new Date().getFullYear()}</p>
        <h1 className="eventos-titulo">{t('eventos.titulo')}</h1>
        <p className="eventos-sub">
          {t('eventos.enAgenda', { count: agenda.length })}
        </p>

        <div className="eventos-buscador">
          <Search size={18} strokeWidth={2} aria-hidden="true" />
          <input
            type="search"
            placeholder={t('eventos.buscarPlaceholder')}
            aria-label={t('eventos.buscarAria')}
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
          {busqueda && (
            <button type="button" className="eventos-buscador-limpiar" onClick={() => setBusqueda('')} aria-label={t('eventos.borrarBusqueda')}>
              <X size={16} strokeWidth={2.4} aria-hidden="true" />
            </button>
          )}
        </div>
      </TopBar>

      <div className="eventos-filtros" role="group" aria-label={t('eventos.filtrarAria')}>
        {filtros.map((f) => (
          <button
            key={f.id}
            type="button"
            className={`eventos-filtro ${filtroActivo === f.id ? 'activo' : ''}`}
            aria-pressed={filtroActivo === f.id}
            onClick={(e) => {
              setFiltro(f.id);
              // La fila se desplaza: el filtro elegido queda a la vista.
              e.currentTarget.scrollIntoView?.({ inline: 'center', block: 'nearest', behavior: 'smooth' });
            }}
          >
            {f.etiqueta}
          </button>
        ))}
      </div>

      <div className="eventos-contenido">
        {cargando && agenda.length === 0 ? (
          <p className="eventos-vacio">{t('eventos.cargando')}</p>
        ) : agenda.length === 0 ? (
          <p className="eventos-vacio">{t('eventos.sinProximos')}</p>
        ) : visibles.length === 0 ? (
          <div className="eventos-vacio">
            <p>{mensajeSinResultados(t, filtroActivo, busqueda)}</p>
            {hayFiltros && (
              <button
                type="button"
                className="eventos-vacio-btn"
                onClick={() => { setFiltro('todos'); setBusqueda(''); }}
              >
                {t('eventos.quitarFiltros')}
              </button>
            )}
          </div>
        ) : (
          <div className="eventos-lista">
            {visibles.map((evento) => (
              <TarjetaEvento key={evento.id} evento={evento} onAbrir={handleSeleccionar} />
            ))}
          </div>
        )}
      </div>

      <BottomNav activo="eventos" onNavigate={onNavigate} />
    </div>
  );
}

export default Eventos;
