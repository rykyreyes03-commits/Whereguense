const modulos = import.meta.glob('../assets/badges/*_transparent.png', { eager: true, import: 'default' });

export const INSIGNIAS = Object.fromEntries(
  Object.entries(modulos).map(([ruta, url]) => {
    const nombreArchivo = ruta.split('/').pop();
    const slug = nombreArchivo.replace('_transparent.png', '').replace(/^badge_/, '');
    return [slug, url];
  })
);
