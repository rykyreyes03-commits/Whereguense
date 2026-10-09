import leon from '../assets/ciudades/leon.webp';
import managua from '../assets/ciudades/managua.webp';
import granada from '../assets/ciudades/granada.webp';
import masaya from '../assets/ciudades/masaya.webp';
import matagalpa from '../assets/ciudades/matagalpa.webp';
import esteli from '../assets/ciudades/esteli.webp';
import chinandega from '../assets/ciudades/chinandega.webp';

// Las ciudades del pasaporte, en el orden en que se muestran. `nombre` es el valor de sitio.ciudad en la base.
// Por ahora solo León tiene sitios; las demás se muestran como "Próximamente".
export const CIUDADES = [
  { id: 'leon', nombre: 'León', imagen: leon },
  { id: 'managua', nombre: 'Managua', imagen: managua },
  { id: 'granada', nombre: 'Granada', imagen: granada },
  { id: 'masaya', nombre: 'Masaya', imagen: masaya },
  { id: 'matagalpa', nombre: 'Matagalpa', imagen: matagalpa },
  { id: 'esteli', nombre: 'Estelí', imagen: esteli },
  { id: 'chinandega', nombre: 'Chinandega', imagen: chinandega },
];

export const CIUDAD_POR_DEFECTO = 'León';

// Ciudad de un sitio: la de la base si ya la cargamos; si no (sitios que aún no están en la base), León.
export function ciudadDeSitio(sitio, ciudadesBD = {}) {
  return ciudadesBD[sitio.id] || sitio.ciudad || CIUDAD_POR_DEFECTO;
}

// { total, obtenidos } de una ciudad. Los sellos por QR de negocio no tienen sitio y no cuentan en ninguna ciudad.
export function conteoDeCiudad(ciudad, sitios, sellos, ciudadesBD = {}) {
  const delaCiudad = sitios.filter((s) => ciudadDeSitio(s, ciudadesBD) === ciudad.nombre);
  const ids = new Set(delaCiudad.map((s) => s.id));
  const obtenidos = new Set(sellos.filter((s) => s.sitioId != null && ids.has(s.sitioId)).map((s) => s.sitioId));
  return { total: delaCiudad.length, obtenidos: obtenidos.size };
}
