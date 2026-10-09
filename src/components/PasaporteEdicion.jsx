import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import './OnboardingCuaderno.css';
import CamposDatosPerfil from './CamposDatosPerfil';
import { armarDatos, validarDatos, valoresDesdeUsuario } from '../utils/datosRegistro';

// Editar la información del pasaporte: los mismos campos del registro, con la fecha, el teléfono, el género y la foto opcionales.
//   onGuardar(datos) -> Promise<boolean>; si guarda, se vuelve al pasaporte con onCancelar.
function PasaporteEdicion({ usuario, vistaPrevia, guardando, error, onGuardar, onCancelar }) {
  const { t } = useTranslation();
  const [valores, setValores] = useState(() => valoresDesdeUsuario(usuario));
  const [errores, setErrores] = useState({});
  const tituloRef = useRef(null);
  useEffect(() => { tituloRef.current?.focus(); }, []);

  const handleCambio = (campo, valor) => {
    setValores((v) => ({ ...v, [campo]: valor }));
    setErrores((e) => ({ ...e, [campo]: '' }));
  };

  const handleGuardar = async (e) => {
    e.preventDefault();
    const nuevos = validarDatos(valores, { nacimientoObligatorio: false });
    setErrores(nuevos);
    if (Object.keys(nuevos).length) return;
    if (await onGuardar(armarDatos(valores))) onCancelar();
  };

  return (
    <section className="oc-vars oc-papel pasaporte-edicion" role="dialog" aria-modal="true" aria-label={t('pasaporteVisual.editar')}>
      <form className="pasaporte-edicion-cuerpo" onSubmit={handleGuardar} noValidate>
        <h1 className="oc-titulo-sello" tabIndex={-1} ref={tituloRef}>{t('pasaporteVisual.editar')}</h1>
        <CamposDatosPerfil
          valores={valores}
          errores={errores}
          onCambio={handleCambio}
          deshabilitado={guardando}
          prefijo="ed"
          nacimientoObligatorio={false}
          vistaPrevia={vistaPrevia}
        />
        {error && <p className="oc-error" role="alert">{error}</p>}
        <button type="submit" className="oc-boton oc-boton--form" disabled={guardando}>{guardando ? t('pasaporteVisual.guardando') : t('pasaporteVisual.guardar')}</button>
        <button type="button" className="pasaporte-edicion-cancelar" disabled={guardando} onClick={onCancelar}>{t('pasaporteVisual.cancelar')}</button>
      </form>
    </section>
  );
}

export default PasaporteEdicion;
