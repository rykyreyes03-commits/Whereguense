// Diseño de la ficha del negocio (negocio.config_diseno, migración 035).
// El esquema lo valida la base (CHECK negocio_config_diseno_valido): estas listas son las mismas.

export const PALETAS = [
  { id: 'azul_marino', nombre: 'Azul marino', color: '#1B2A6B' },
  { id: 'terracota', nombre: 'Terracota', color: '#C0622A' },
  { id: 'azul', nombre: 'Azul', color: '#2563EB' },
  { id: 'verde', nombre: 'Verde', color: '#0D7D5E' },
  { id: 'rojo', nombre: 'Rojo', color: '#C0392B' },
  { id: 'dorado', nombre: 'Dorado', color: '#B8860B' },
  { id: 'teal', nombre: 'Turquesa', color: '#0E7490' },
  { id: 'magenta', nombre: 'Magenta', color: '#C2185B' },
];

export const LETRAS = [
  { id: 'clasica', nombre: 'Clásica', titulo: "'Bitter', serif", cuerpo: "'Nunito', sans-serif" },
  { id: 'elegante', nombre: 'Elegante', titulo: "'Playfair Display', Georgia, serif", cuerpo: "'Lora', Georgia, serif" },
  { id: 'moderna', nombre: 'Moderna', titulo: "'Poppins', 'Nunito', sans-serif", cuerpo: "'Poppins', 'Nunito', sans-serif" },
];

export const SECCIONES = [
  { id: 'horarios', nombre: 'Horarios' },
  { id: 'productos', nombre: 'Productos' },
  { id: 'fotos', nombre: 'Fotos' },
  { id: 'actividades', nombre: 'Actividades' },
  { id: 'resenas', nombre: 'Reseñas' },
  { id: 'ubicacion', nombre: 'Ubicación' },
];

export const LAYOUTS = [
  { id: 'cuadricula', nombre: 'Cuadrícula' },
  { id: 'lista', nombre: 'Lista' },
];

export const MAX_DESCRIPCION = 300;

export const DISENO_POR_DEFECTO = {
  paleta: 'azul_marino',
  letra: 'clasica',
  portadaUrl: null,
  logoUrl: null,
  descripcion: '',
  whatsapp: '',
  secciones: SECCIONES.map((s) => s.id), // visibles, en orden
  layoutProductos: 'cuadricula',
};

const IDS_SECCION = new Set(SECCIONES.map((s) => s.id));

// config_diseno (JSON de la base, puede ser {} o tener solo algunas claves) -> diseño completo y seguro.
// Lo que falte o no sea válido cae al valor por defecto: la ficha nunca se rompe por un dato raro.
export function disenoDesdeConfig(config) {
  const c = config && typeof config === 'object' ? config : {};
  const base = DISENO_POR_DEFECTO;
  const secciones = Array.isArray(c.secciones_visibles)
    ? [...new Set(c.secciones_visibles.filter((s) => IDS_SECCION.has(s)))]
    : [...base.secciones];
  return {
    paleta: PALETAS.some((p) => p.id === c.paleta) ? c.paleta : base.paleta,
    letra: LETRAS.some((l) => l.id === c.letra) ? c.letra : base.letra,
    portadaUrl: typeof c.portada_url === 'string' && c.portada_url.startsWith('https://') ? c.portada_url : null,
    logoUrl: typeof c.logo_url === 'string' && c.logo_url.startsWith('https://') ? c.logo_url : null,
    descripcion: typeof c.descripcion === 'string' ? c.descripcion.slice(0, MAX_DESCRIPCION) : '',
    whatsapp: typeof c.whatsapp === 'string' && /^[0-9]{8,15}$/.test(c.whatsapp) ? c.whatsapp : '',
    secciones,
    layoutProductos: LAYOUTS.some((l) => l.id === c.layout_productos) ? c.layout_productos : base.layoutProductos,
  };
}

// Diseño completo -> config_diseno para guardar (siempre las seis claves, sin texto libre).
export function configDesdeDiseno(d) {
  return {
    paleta: d.paleta,
    letra: d.letra,
    portada_url: d.portadaUrl || null,
    logo_url: d.logoUrl || null,
    descripcion: (d.descripcion || '').trim() || null,
    whatsapp: d.whatsapp || null,
    secciones_visibles: d.secciones,
    layout_productos: d.layoutProductos,
  };
}

export function disenosIguales(a, b) {
  return JSON.stringify(configDesdeDiseno(a)) === JSON.stringify(configDesdeDiseno(b));
}

// ---- Contraste (WCAG) ----
function luminancia(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contraste(hexA, hexB) {
  const [a, b] = [luminancia(hexA), luminancia(hexB)].sort((x, y) => y - x);
  return (a + 0.05) / (b + 0.05);
}

// Texto claro u oscuro sobre un color de paleta: el de mayor contraste (siempre >= 4.5:1 con estos colores).
export function textoSobre(hex) {
  return contraste(hex, '#FFFFFF') >= contraste(hex, '#111111') ? '#FFFFFF' : '#111111';
}

// Variables CSS de la ficha: se ponen en su contenedor y el CSS las usa.
export function variablesFicha(d) {
  const paleta = PALETAS.find((p) => p.id === d.paleta) || PALETAS[0];
  const letra = LETRAS.find((l) => l.id === d.letra) || LETRAS[0];
  return {
    '--ficha-color': paleta.color,
    '--ficha-sobre-color': textoSobre(paleta.color),
    '--ficha-titulo': letra.titulo,
    '--ficha-cuerpo': letra.cuerpo,
  };
}

// Enlace de WhatsApp. Nicaragua usa números de 8 dígitos: sin código de país se le agrega 505.
export function enlaceWhatsapp(digitos) {
  if (!/^[0-9]{8,15}$/.test(digitos || '')) return null;
  const numero = digitos.length === 8 ? `505${digitos}` : digitos;
  return `https://wa.me/${numero}`;
}

// Enlace de "Cómo llegar": indicaciones de Google Maps hasta las coordenadas del negocio; null si no hay coordenadas válidas.
export function enlaceComoLlegar(lat, lng) {
  const a = Number(lat);
  const b = Number(lng);
  if (lat === null || lng === null || lat === undefined || lng === undefined || !Number.isFinite(a) || !Number.isFinite(b)) return null;
  if (Math.abs(a) > 90 || Math.abs(b) > 180) return null;
  return `https://www.google.com/maps/dir/?api=1&destination=${a},${b}`;
}
