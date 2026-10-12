/**
 * Achica una foto en el navegador antes de subirla: lado mayor hasta
 * `ladoMaximo` y recomprimida. Una foto de celular de 4–8 MB queda en unos
 * cientos de KB: sube rápido, no choca con el límite y las páginas cargan
 * livianas. Respeta la orientación (EXIF) y la transparencia (logos PNG).
 * Si el navegador no puede procesarla, se sube la original.
 */
export async function prepararImagen(
  archivo: File,
  { ladoMaximo = 1600, calidad = 0.82 }: { ladoMaximo?: number; calidad?: number } = {}
): Promise<File> {
  if (!/^image\/(jpeg|png|webp)$/.test(archivo.type) || typeof createImageBitmap !== 'function') return archivo;
  try {
    // createImageBitmap aplica la rotación de la cámara (imageOrientation por defecto).
    const imagen = await createImageBitmap(archivo);
    const escala = Math.min(1, ladoMaximo / Math.max(imagen.width, imagen.height));
    // Chica y liviana: no vale la pena recomprimir.
    if (escala === 1 && archivo.size < 400 * 1024) {
      imagen.close();
      return archivo;
    }
    const lienzo = document.createElement('canvas');
    lienzo.width = Math.round(imagen.width * escala);
    lienzo.height = Math.round(imagen.height * escala);
    const contexto = lienzo.getContext('2d');
    if (!contexto) return archivo;
    contexto.imageSmoothingQuality = 'high';
    contexto.drawImage(imagen, 0, 0, lienzo.width, lienzo.height);
    imagen.close();

    const exportar = (tipo: string) =>
      new Promise<Blob | null>((resolver) => lienzo.toBlob(resolver, tipo, calidad));
    // WebP conserva la transparencia y pesa menos; si el navegador no lo genera,
    // JPEG para fotos y PNG para lo que traía transparencia.
    let blob = await exportar('image/webp');
    if (!blob || blob.type !== 'image/webp') blob = await exportar(archivo.type === 'image/png' ? 'image/png' : 'image/jpeg');
    if (!blob || blob.size >= archivo.size) return archivo;

    const extension = blob.type === 'image/webp' ? 'webp' : blob.type === 'image/png' ? 'png' : 'jpg';
    const nombre = archivo.name.replace(/\.[^.]+$/, '') + '.' + extension;
    return new File([blob], nombre, { type: blob.type });
  } catch {
    return archivo;
  }
}
