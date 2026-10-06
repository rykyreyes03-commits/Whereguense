import { Star } from 'lucide-react';
import ListaResenas from './ListaResenas';
import { EstrellasValor } from './Estrellas';
import { textoCantidad, textoPromedio } from '../utils/resenas';
import { useResenas } from '../hooks/useResenas';
import './ListaResenas.css';

const FILAS = [['cinco', 5], ['cuatro', 4], ['tres', 3], ['dos', 2], ['uno', 1]];

// Pestaña "Reseñas" del emprendedor: resumen con una barra por estrella y la lista con "Responder".
function PanelResenasNegocio({ negocioId }) {
  const { resumen, resenas, cargando, error, responder } = useResenas(negocioId);

  if (negocioId == null) return null;
  if (cargando) return <section className="perfilnegocio-card"><p className="resenas-vacio">Cargando reseñas…</p></section>;
  if (error) return <section className="perfilnegocio-card"><p className="resenas-error" role="alert">{error}</p></section>;

  const total = resumen?.total || 0;
  if (total === 0) {
    return (
      <section className="perfilnegocio-card perfilnegocio-empty">
        <span className="perfilnegocio-empty-icono" aria-hidden="true"><Star size={28} strokeWidth={1.8} /></span>
        <p>Aún no tienes reseñas. Aparecen aquí cuando alguien con un sello de tu negocio deje la suya.</p>
      </section>
    );
  }

  return (
    <>
      <section className="perfilnegocio-card" aria-label="Resumen de reseñas">
        <div className="resenas-panel-resumen">
          <span className="resenas-panel-promedio">{textoPromedio(resumen.promedio)}</span>
          <div>
            <EstrellasValor valor={resumen.promedio} tamano={20} />
            <span className="resenas-panel-total">{textoCantidad(total)}</span>
          </div>
        </div>
        <ul className="resenas-barras">
          {FILAS.map(([clave, n]) => (
            <li key={clave} className="resenas-barra">
              <span>{n} ★</span>
              <span className="resenas-barra-pista" aria-hidden="true">
                <span className="resenas-barra-relleno" style={{ width: `${(resumen[clave] / total) * 100}%` }} />
              </span>
              <span className="resenas-barra-cuenta">
                {resumen[clave]}
                <span className="sr-only"> de {textoCantidad(total)} con {n === 1 ? '1 estrella' : `${n} estrellas`}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>
      <section className="perfilnegocio-card" aria-label="Lista de reseñas">
        <ListaResenas resenas={resenas} onResponder={responder} />
      </section>
    </>
  );
}

export default PanelResenasNegocio;
