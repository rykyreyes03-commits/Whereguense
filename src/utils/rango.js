export function obtenerRango(cantidadSellos) {
  if (cantidadSellos >= 8) return { nombre: "Maestro Güegüense", color: "#d32f2f" };
  if (cantidadSellos >= 5) return { nombre: "Explorador", color: "#ff9800" };
  return { nombre: "Principiante", color: "#4caf50" };
}
