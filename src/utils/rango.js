export function obtenerRango(cantidadSellos) {
  if (cantidadSellos >= 8) return { clave: "maestro", nombre: "Maestro Güegüense", color: "#d32f2f" };
  if (cantidadSellos >= 5) return { clave: "explorador", nombre: "Explorador", color: "#ff9800" };
  return { clave: "principiante", nombre: "Principiante", color: "#4caf50" };
}

function generarUmbrales(maxNivel = 40) {
  const umbrales = [0, 2, 3];
  for (let i = 3; i < maxNivel; i++) {
    umbrales.push(umbrales[i - 1] + umbrales[i - 2]);
  }
  return umbrales;
}

const UMBRALES_NIVEL = generarUmbrales();

export function obtenerNivel(cantidadSellos) {
  let nivel = 1;
  for (let i = 1; i < UMBRALES_NIVEL.length; i++) {
    if (cantidadSellos >= UMBRALES_NIVEL[i]) {
      nivel = i + 1;
    } else {
      break;
    }
  }
  return nivel;
}

export function sellosParaNivel(nivel) {
  const indice = nivel - 1;
  if (indice < 0) return 0;
  if (indice >= UMBRALES_NIVEL.length) return UMBRALES_NIVEL[UMBRALES_NIVEL.length - 1];
  return UMBRALES_NIVEL[indice];
}

export function sellosParaSiguienteNivel(cantidadSellos) {
  const nivelActual = obtenerNivel(cantidadSellos);
  return sellosParaNivel(nivelActual + 1);
}
