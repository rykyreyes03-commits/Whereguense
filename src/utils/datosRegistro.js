// Datos que se piden al registrarse y que luego se pueden editar desde el pasaporte (nombre, país, idioma, nacimiento, teléfono, género, foto).
export const PAISES = ['Nicaragua', 'Honduras', 'Costa Rica', 'El Salvador', 'Guatemala', 'Panamá', 'México', 'Colombia', 'Estados Unidos', 'España', 'Otro país'];
export const CODIGOS = ['+505', '+504', '+506', '+503', '+502', '+507', '+52', '+57', '+1', '+34'];
export const IDIOMAS = [{ valor: 'es', texto: 'Español' }, { valor: 'en', texto: 'English' }];
export const GENEROS = [
  { valor: 'masculino', texto: 'Masculino' },
  { valor: 'femenino', texto: 'Femenino' },
  { valor: 'prefiero_no_decir', texto: 'Prefiero no decir' },
];
export const TIPOS_FOTO = ['image/jpeg', 'image/png', 'image/webp'];

// AAAA-MM-DD de hoy, en la hora del dispositivo
export function hoy() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// "+505 88888888" -> { codigo: '+505', numero: '88888888' } (sin teléfono: código +505 y número vacío)
export function separarTelefono(telefono) {
  const m = /^(\+\d{1,4}) (.+)$/.exec(telefono || '');
  return m ? { codigo: CODIGOS.includes(m[1]) ? m[1] : '+505', numero: m[2] } : { codigo: '+505', numero: '' };
}

// Valores del formulario a partir de la fila de usuario (o de valores por defecto)
export function valoresDesdeUsuario(usuario, previo = {}) {
  const { codigo, numero } = separarTelefono(usuario?.telefono);
  return {
    nombre: usuario?.nombre_usuario || previo.nombre || '',
    pais: usuario?.pais || previo.pais || 'Nicaragua',
    idioma: usuario?.idioma_preferido || previo.idioma || 'es',
    nacimiento: usuario?.fecha_nacimiento || '',
    codigo,
    telefono: numero,
    genero: usuario?.genero || '',
    foto: null,
  };
}

// Errores por campo ({} si todo está bien). La fecha solo es obligatoria al registrarse.
export function validarDatos(v, { nacimientoObligatorio = true } = {}) {
  const e = {};
  const digitos = v.telefono.replace(/\D/g, '');
  if (!v.nombre.trim()) e.nombre = 'Escribe tu nombre de usuario.';
  if (!v.pais) e.pais = 'Selecciona tu país.';
  if (!v.nacimiento) {
    if (nacimientoObligatorio) e.nacimiento = 'Indica tu fecha de nacimiento.';
  } else if (v.nacimiento < '1900-01-01' || v.nacimiento > hoy()) {
    e.nacimiento = 'Revisa tu fecha de nacimiento.';
  }
  if (digitos && (digitos.length < 4 || digitos.length > 14)) e.telefono = 'El teléfono debe tener entre 4 y 14 dígitos.';
  return e;
}

// Lo que se guarda (null en lo opcional que quedó vacío)
export function armarDatos(v) {
  const digitos = v.telefono.replace(/\D/g, '');
  return {
    nombre: v.nombre.trim(),
    pais: v.pais,
    idioma: v.idioma,
    fechaNacimiento: v.nacimiento || null,
    telefono: digitos ? `${v.codigo} ${digitos}` : null,
    genero: v.genero || null,
    foto: v.foto,
  };
}
