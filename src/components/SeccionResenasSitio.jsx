import { useState } from 'react';
import { Star } from 'lucide-react';
import ListaResenas from './ListaResenas';
import DialogoConfirmacion from './DialogoConfirmacion';
import { FormularioResena } from './SeccionResenas';
import { EstrellasValor } from './Estrellas';
import { textoCantidad, textoPromedio } from '../utils/resenas';
import { useResenasSitio } from '../hooks/useResenasSitio';
import './ListaResenas.css';

// Reseñas de un sitio turístico: a diferencia de los negocios, basta con tener sesión (no se pide sello).
function SeccionResenasSitio({ sitioId, nombreSitio }) {
  const { resumen, resenas, haySesion, cargando, error, guardar, eliminarMia } = useResenasSitio(sitioId);
  const [escribiendo, setEscribiendo] = useState(false);
  const [confirmandoBorrado, setConfirmandoBorrado] = useState(false);
  const [borrando, setBorrando] = useState(false);
  const [errorBorrado, setErrorBorrado] = useState('');

  if (cargando) return null;
  const miResena = resenas.find((r) => r.esMia) || null;
  const total = resumen?.total || 0;

  const borrar = async () => {
    setBorrando(true);
    setErrorBorrado('');
    const r = await eliminarMia();
    setBorrando(false);
    if (r?.exito) setConfirmandoBorrado(false);
    else setErrorBorrado(r?.mensaje || 'No se pudo eliminar tu reseña.');
  };

  return (
    <section className="sitio-detalle-card resenas-seccion" aria-labelledby="sitio-resenas-titulo">
      <h3 id="sitio-resenas-titulo" className="sitio-detalle-titulo">Reseñas</h3>
      {error ? (
        <p className="resenas-error" role="alert">{error}</p>
      ) : (
        <>
          <p className="resenas-resumen">
            {total > 0 ? (
              <>
                <EstrellasValor valor={resumen.promedio} />
                <strong>{textoPromedio(resumen.promedio)}</strong>
                <span>· {textoCantidad(total)}</span>
              </>
            ) : (
              <>
                <Star size={16} strokeWidth={2} aria-hidden="true" className="estrella" />
                <span>Aún sin reseñas</span>
              </>
            )}
          </p>

          {haySesion ? (
            <>
              <button type="button" className="resenas-boton-principal resenas-boton-ancho" onClick={() => setEscribiendo(true)}>
                {miResena ? 'Editar mi reseña' : 'Escribir reseña'}
              </button>
              {miResena && (
                <button type="button" className="resenas-boton-secundario" onClick={() => setConfirmandoBorrado(true)}>
                  Eliminar mi reseña
                </button>
              )}
            </>
          ) : (
            <p className="resenas-aviso">Inicia sesión para dejar tu reseña.</p>
          )}

          {total > 0 && <ListaResenas resenas={resenas} />}
        </>
      )}

      {escribiendo && (
        <FormularioResena
          miResena={miResena}
          nombreNegocio={nombreSitio}
          max={1000}
          placeholder="Cuenta cómo fue tu visita: lo que viste, lo que te sorprendió, qué recomiendas."
          onGuardar={guardar}
          onCerrar={() => setEscribiendo(false)}
        />
      )}
      {confirmandoBorrado && (
        <DialogoConfirmacion
          titulo="¿Eliminar tu reseña?"
          texto="Tu reseña dejará de verse en este sitio. Podrás escribir otra cuando quieras."
          etiquetaConfirmar="Eliminar"
          etiquetaCargando="Eliminando…"
          tono="peligro"
          cargando={borrando}
          error={errorBorrado}
          onConfirmar={borrar}
          onCancelar={() => { setConfirmandoBorrado(false); setErrorBorrado(''); }}
        />
      )}
    </section>
  );
}

export default SeccionResenasSitio;
