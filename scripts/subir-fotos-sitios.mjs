// Sube las fotos ya convertidas (<carpeta>/<sitio_id>/NN_nombre.jpg + indice.json) al bucket 'sitios'
// y llena public.sitio_foto. La primera de cada sitio (orden 0) es la portada.
// Uso:  node scripts/subir-fotos-sitios.mjs <carpeta> [--seco]
// Lee SUPABASE_SERVICE_KEY del entorno o de .env.local (nunca se imprime). VITE_SUPABASE_URL de .env.local.
// Idempotente: sube con upsert y reemplaza las filas de cada sitio.
import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

function leerEnvLocal() {
  const ruta = join(process.cwd(), '.env.local');
  const salida = {};
  if (!existsSync(ruta)) return salida;
  for (const linea of readFileSync(ruta, 'utf8').split(/\r?\n/)) {
    const m = linea.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m) salida[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  }
  return salida;
}

const carpeta = process.argv[2];
const seco = process.argv.includes('--seco');
if (!carpeta) { console.error('Falta la carpeta de fotos convertidas.'); process.exit(1); }

const env = leerEnvLocal();
const url = process.env.VITE_SUPABASE_URL || env.VITE_SUPABASE_URL;
const clave = process.env.SUPABASE_SERVICE_KEY || env.SUPABASE_SERVICE_KEY;
if (!url) { console.error('Falta VITE_SUPABASE_URL.'); process.exit(1); }
if (!clave && !seco) { console.error('Falta SUPABASE_SERVICE_KEY (variable de entorno o .env.local).'); process.exit(1); }

const indice = JSON.parse(readFileSync(join(carpeta, 'indice.json'), 'utf8'));
const supabase = seco ? null : createClient(url, clave, { auth: { persistSession: false } });
const resumen = []; const errores = [];

for (const [sitioId, archivos] of Object.entries(indice)) {
  let subidas = 0;
  const filas = [];
  for (let i = 0; i < archivos.length; i++) {
    const ruta = `${sitioId}/galeria/${archivos[i]}`;
    if (seco) { subidas++; continue; }
    const { error } = await supabase.storage.from('sitios')
      .upload(ruta, readFileSync(join(carpeta, sitioId, archivos[i])), { contentType: 'image/jpeg', upsert: true });
    if (error) { errores.push(`${ruta}: ${error.message}`); continue; }
    subidas++;
    filas.push({
      sitio_id: Number(sitioId),
      url: supabase.storage.from('sitios').getPublicUrl(ruta).data.publicUrl,
      orden: i,
      es_portada: i === 0,
    });
  }
  if (!seco && filas.length) {
    // La portada es la de orden 0; si esa falló, se reemplaza todo igual y la primera subida queda sin portada marcada.
    const del = await supabase.from('sitio_foto').delete().eq('sitio_id', Number(sitioId));
    const ins = del.error ? del : await supabase.from('sitio_foto').insert(filas);
    if (ins.error) errores.push(`sitio ${sitioId} (tabla): ${ins.error.message}`);
  }
  resumen.push(`sitio ${sitioId}: ${subidas}/${archivos.length}`);
}
console.log(resumen.join('\n'));
console.log(`\nSitios: ${resumen.length}. Errores: ${errores.length}`);
errores.forEach((e) => console.log(' - ' + e));
