import { rangoConAnio, rangoHoras, notaDiaSiguiente } from './eventos';

// Texto que se comparte de un evento: nombre, fechas (con la hora si la tiene) y lugar.
export function textoParaCompartir(evento) {
  const fechas = rangoConAnio(evento.fechaInicio, evento.fechaFin);
  const horas = rangoHoras(evento.horaInicio, evento.horaFin);
  const cuando = [fechas, horas].filter(Boolean).join(' · ');
  const termina = notaDiaSiguiente(evento.horaInicio, evento.horaFin);
  const donde = evento.lugar || (evento.organizador?.nombre ? `Organiza: ${evento.organizador.nombre}` : '');
  return [evento.nombre, cuando, termina, donde, 'Lo encuentras en Wheregüense']
    .filter(Boolean)
    .join('\n');
}

// Copia al portapapeles: navigator.clipboard donde existe (contexto seguro) y, si no, el
// método viejo con un textarea (algunos WebView no exponen navigator.clipboard).
async function copiar(texto) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(texto);
      return true;
    } catch {
      // cae al método viejo
    }
  }
  try {
    const area = document.createElement('textarea');
    area.value = texto;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    const copiado = document.execCommand('copy');
    document.body.removeChild(area);
    return copiado;
  } catch {
    return false;
  }
}

// Comparte con la hoja del sistema (navigator.share) si existe y, si no, copia el texto.
// Devuelve: 'compartido' | 'copiado' | 'cancelado' | 'error'.
export async function compartirEvento(evento) {
  const texto = textoParaCompartir(evento);

  if (typeof navigator.share === 'function') {
    try {
      await navigator.share({ title: evento.nombre, text: texto });
      return 'compartido';
    } catch (error) {
      // Cerrar la hoja sin elegir nada no es un error ni pide el aviso de "Copiado".
      if (error?.name === 'AbortError') return 'cancelado';
      // Otro fallo de navigator.share: se intenta copiar.
    }
  }

  return (await copiar(texto)) ? 'copiado' : 'error';
}
