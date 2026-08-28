export function obtenerRango(cantidadSellos) {
  if (cantidadSellos >= 8) return { nombre: "Maestro Güegüense", color: "#d32f2f" };
  if (cantidadSellos >= 5) return { nombre: "Explorador", color: "#ff9800" };
  return { nombre: "Principiante", color: "#4caf50" };
}

export function obtenerNivel(cantidadSellos) {
  return 1 + Math.floor(cantidadSellos / 2);
}

export function sellosParaNivel(nivel) {
  return Math.max(0, (nivel - 1) * 2);
}