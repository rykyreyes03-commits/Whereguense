// Rangos de los sellos (038): cobre vale 1 punto, plata 0.5, oro 2. Cada sitio tiene el suyo (sitio.rango en la base).
// El color de la insignia es un punto dibujado (no un emoji, que se ve distinto en cada dispositivo).

export const RANGOS_SELLO = {
  cobre: { clave: 'cobre', nombre: 'Cobre', color: '#B06A2C', puntos: 1 },
  plata: { clave: 'plata', nombre: 'Plata', color: '#9AA3AD', puntos: 0.5 },
  oro: { clave: 'oro', nombre: 'Oro', color: '#E5A900', puntos: 2 },
};

// Un sitio sin rango conocido (los que aún no están en la base) vale como cobre.
export function rangoDeSello(clave) {
  return RANGOS_SELLO[clave] || RANGOS_SELLO.cobre;
}

// 1 -> "1", 0.5 -> "0.5", 2.5 -> "2.5"
export function textoPuntos(valor) {
  const n = Number(valor) || 0;
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}
