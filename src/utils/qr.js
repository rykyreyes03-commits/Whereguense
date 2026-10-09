// Contenido de los QR de Wheregüense. Cada tipo lleva su prefijo para que las pantallas de
// escaneo sepan de qué es el código y avisen si se escaneó en la pantalla equivocada.
export const PREFIJO_SELLO = 'WHEREGUENSE-QR:';      // sello de una actividad (canjear_qr_sello)
export const PREFIJO_CUPON = 'WHEREGUENSE-CUPON:';   // "obtener" un cupón (obtener_cupon)
export const PREFIJO_CANJE = 'WHEREGUENSE-CANJE:';   // "canjear" cupones en un negocio (iniciar_canje_cupon)

export function valorQRSello(token) {
  return `${PREFIJO_SELLO}${token}`;
}
export function valorQRCupon(token) {
  return `${PREFIJO_CUPON}${token}`;
}
export function valorQRCanje(token) {
  return `${PREFIJO_CANJE}${token}`;
}

// { tipo: 'sello' | 'cupon' | 'canje', token } o null si no es un QR de Wheregüense.
export function clasificarQR(texto) {
  if (typeof texto !== 'string') return null;
  const tipos = [
    ['sello', PREFIJO_SELLO],
    ['cupon', PREFIJO_CUPON],
    ['canje', PREFIJO_CANJE],
  ];
  for (const [tipo, prefijo] of tipos) {
    if (texto.startsWith(prefijo)) return { tipo, token: texto.slice(prefijo.length) };
  }
  return null;
}
