// Foto de perfil: se reduce a 256 px (JPEG) antes de guardarla, igual en el perfil y en el registro.
export const FOTO_MAX_PX = 256;

export function redimensionarImagen(file) {
  return new Promise((resolve, reject) => {
    const lector = new FileReader();
    lector.onerror = () => reject(new Error('No se pudo leer el archivo.'));
    lector.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('El archivo no es una imagen válida.'));
      img.onload = () => {
        const escala = Math.min(1, FOTO_MAX_PX / Math.max(img.width, img.height));
        const w = Math.round(img.width * escala);
        const h = Math.round(img.height * escala);
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.src = lector.result;
    };
    lector.readAsDataURL(file);
  });
}

// data:image/jpeg;base64,... -> Blob (para subirla a Storage)
export async function dataUrlABlob(dataUrl) {
  const r = await fetch(dataUrl);
  return r.blob();
}
