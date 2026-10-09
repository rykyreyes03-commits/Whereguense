// Datos del pasaporte de viajero (PasaporteVisual).

// La ruta donde el usuario tiene más sellos (en empate, la primera); null si no tiene sellos en ninguna.
export function rutaFavorita(rutas, sellos) {
  const ids = new Set(sellos.filter((s) => s.sitioId != null).map((s) => s.sitioId));
  let mejor = null;
  let mejorCuenta = 0;
  for (const ruta of rutas || []) {
    const cuenta = (ruta.sitios || []).filter((s) => ids.has(s.id)).length;
    if (cuenta > mejorCuenta) { mejor = ruta; mejorCuenta = cuenta; }
  }
  return mejor;
}

// "#" + los primeros 6 caracteres del id del usuario ("#------" sin sesión)
export function numeroDePasaporte(usuarioId) {
  return usuarioId ? `#${String(usuarioId).slice(0, 6)}` : '#------';
}
