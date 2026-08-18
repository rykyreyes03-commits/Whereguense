export function obtenerRango(cantidadSellos) {
  if (cantidadSellos >= 8) return { nombre: "Maestro Güegüense", color: "#d32f2f" };
  if (cantidadSellos >= 5) return { nombre: "Explorador", color: "#ff9800" };
  return { nombre: "Principiante", color: "#4caf50" };
}

// SUPUESTO: curva de nivel temporal, confirmar con el equipo
export function obtenerNivel(cantidadSellos) {
  return cantidadSellos + 1;
}
