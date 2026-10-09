import { useCallback, useState } from 'react';
import EscanearQR from './EscanearQR';
import CanjearCupon from './CanjearCupon';

// "Escanear cupón": un QR de cupón se OBTIENE (obtener_cupon); el QR de canje del negocio abre
// la lista de cupones del turista en ese negocio para elegir cuál USAR (iniciar_canje_cupon
// y después usar_cupon). Los QR de sello se avisan dentro del escáner.
function EscanearCupon({ cupones, onObtenerCupon, onIniciarCanje, onUsarCupon, onVolver, onNavigate }) {
  // { token, negocioId, nombreNegocio } mientras el turista elige qué cupón usar.
  const [canje, setCanje] = useState(null);

  const handleCodigo = useCallback(async ({ tipo, token }) => {
    if (tipo === 'cupon') {
      const res = await onObtenerCupon(token);
      if (!res.exito) return { exito: false, mensaje: res.mensaje };
      return {
        exito: true,
        mensaje: res.mensaje,
        detalle: `${res.cupon.descuento_porcentaje}% de descuento · ${res.cupon.descripcion} — ${res.cupon.nombre_negocio}`,
        ir: { etiqueta: 'Ver mis cupones', pantalla: 'misCupones' },
      };
    }

    // tipo === 'canje'
    const res = await onIniciarCanje(token);
    if (!res.exito) return { exito: false, mensaje: res.mensaje };
    setCanje({ token, negocioId: res.negocio_id, nombreNegocio: res.nombre_negocio });
    return null; // la pantalla cambia a la lista de cupones del negocio
  }, [onObtenerCupon, onIniciarCanje]);

  if (canje) {
    return (
      <CanjearCupon
        canje={canje}
        cupones={cupones}
        onUsarCupon={onUsarCupon}
        onVolver={() => setCanje(null)}
        onNavigate={onNavigate}
      />
    );
  }

  return (
    <EscanearQR
      modo="cupon"
      onCodigo={handleCodigo}
      onVolver={onVolver}
      onNavigate={onNavigate}
    />
  );
}

export default EscanearCupon;
