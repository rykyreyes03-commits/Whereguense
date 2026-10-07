import { useState } from 'react';
import { Star } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import ListaResenas from './ListaResenas';
import DialogoConfirmacion from './DialogoConfirmacion';
import { FormularioResena } from './SeccionResenas';
import { EstrellasValor } from './Estrellas';
import { textoPromedio } from '../utils/resenas';
import { useResenasSitio } from '../hooks/useResenasSitio';
import './ListaResenas.css';

// Reseñas de un sitio turístico: a diferencia de los negocios, basta con tener sesión (no se pide sello).
function SeccionResenasSitio({ sitioId, nombreSitio }) {
  const { t } = useTranslation();
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
    else setErrorBorrado(r?.mensaje || t('resenas.errorBorrado'));
  };

  return (
    <section className="sitio-detalle-card resenas-seccion" aria-labelledby="sitio-resenas-titulo">
      <h3 id="sitio-resenas-titulo" className="sitio-detalle-titulo">{t('resenas.titulo')}</h3>
      {error ? (
        <p className="resenas-error" role="alert">{error}</p>
      ) : (
        <>
          <p className="resenas-resumen">
            {total > 0 ? (
              <>
                <EstrellasValor valor={resumen.promedio} />
                <strong>{textoPromedio(resumen.promedio)}</strong>
                <span>· {t('resenas.cantidad', { count: total })}</span>
              </>
            ) : (
              <>
                <Star size={16} strokeWidth={2} aria-hidden="true" className="estrella" />
                <span>{t('resenas.aunSin')}</span>
              </>
            )}
          </p>

          {haySesion ? (
            <>
              <button type="button" className="resenas-boton-principal resenas-boton-ancho" onClick={() => setEscribiendo(true)}>
                {miResena ? t('resenas.editar') : t('resenas.escribir')}
              </button>
              {miResena && (
                <button type="button" className="resenas-boton-secundario" onClick={() => setConfirmandoBorrado(true)}>
                  {t('resenas.eliminar')}
                </button>
              )}
            </>
          ) : (
            <p className="resenas-aviso">{t('resenas.iniciaSesion')}</p>
          )}

          {total > 0 && <ListaResenas resenas={resenas} />}
        </>
      )}

      {escribiendo && (
        <FormularioResena
          miResena={miResena}
          nombreNegocio={nombreSitio}
          max={1000}
          placeholder={t('resenas.placeholderSitio')}
          onGuardar={guardar}
          onCerrar={() => setEscribiendo(false)}
        />
      )}
      {confirmandoBorrado && (
        <DialogoConfirmacion
          titulo={t('resenas.dialogoTitulo')}
          texto={t('resenas.dialogoTexto')}
          etiquetaConfirmar={t('resenas.dialogoConfirmar')}
          etiquetaCargando={t('resenas.dialogoCargando')}
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
