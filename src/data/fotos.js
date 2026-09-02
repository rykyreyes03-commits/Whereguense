const modulos = import.meta.glob('../assets/fotos/*.{jpg,jpeg,png,JPG,JPEG,PNG}', { eager: true, import: 'default' });

export const FOTOS_SITIOS = Object.fromEntries(
  Object.entries(modulos).map(([ruta, url]) => {
    const nombreArchivo = ruta.split('/').pop();
    const id = nombreArchivo.replace(/\.(jpg|jpeg|png)$/i, '');
    return [id, url];
  })
);
