// Galería de fotos del negocio (tabla negocio_foto, migración 036). Las mismas reglas que aplica la base y el bucket
// 'negocios': hasta 10 fotos, jpg/png/webp, 10 MB cada una, carpeta <usuario_id>/fotos/.

export const MAX_FOTOS = 10;
export const TAMANO_MAX_MB = 10;
export const TIPOS_FOTO = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
export const ACEPTA_FOTOS = Object.keys(TIPOS_FOTO).join(',');

// Mensaje de por qué no se puede subir este archivo, o null si está bien. `cantidad` = fotos que ya tiene el negocio.
export function motivoDeRechazo(file, cantidad) {
  if (cantidad >= MAX_FOTOS) return `Ya tienes ${MAX_FOTOS} fotos. Quita alguna para subir otra.`;
  if (!TIPOS_FOTO[file.type]) return `"${file.name}" no es JPG, PNG ni WebP.`;
  if (file.size > TAMANO_MAX_MB * 1024 * 1024) return `"${file.name}" pesa más de ${TAMANO_MAX_MB} MB. Prueba con una foto más liviana.`;
  return null;
}

// <usuario_id>/fotos/<negocio_id>_<marca de tiempo>.<ext>
export function rutaDeFoto(usuarioId, negocioId, file, ahora = Date.now()) {
  return `${usuarioId}/fotos/${negocioId}_${ahora}.${TIPOS_FOTO[file.type]}`;
}

// Mueve el elemento `desde` a la posición `hasta` sin tocar el arreglo original.
export function moverElemento(lista, desde, hasta) {
  if (desde === hasta || desde < 0 || hasta < 0 || desde >= lista.length || hasta >= lista.length) return lista;
  const copia = [...lista];
  const [x] = copia.splice(desde, 1);
  copia.splice(hasta, 0, x);
  return copia;
}
