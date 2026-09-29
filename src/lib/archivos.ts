import { mkdir, writeFile } from 'fs/promises';
import { randomUUID } from 'crypto';
import path from 'path';

/**
 * Carpeta de fotos subidas. Fuera del control de git: el deploy hace
 * checkout -f pero no toca lo no versionado, así que sobrevive versiones.
 */
export const DIR_ARCHIVOS =
  process.env.ARCHIVOS_DIR ?? path.join(process.cwd(), 'archivos-subidos');

const TIPOS_IMAGEN: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};
const MAX_BYTES = 5 * 1024 * 1024;

/** Valida y guarda una imagen subida con nombre único. */
export async function guardarImagen(
  archivo: unknown
): Promise<{ ok: true; nombre: string; url: string } | { ok: false; error: string; status: number }> {
  if (!(archivo instanceof File)) {
    return { ok: false, error: 'Falta el archivo.', status: 400 };
  }
  const extension = TIPOS_IMAGEN[archivo.type];
  if (!extension) {
    return { ok: false, error: 'Solo imágenes JPG, PNG o WebP.', status: 415 };
  }
  if (archivo.size > MAX_BYTES) {
    return { ok: false, error: 'La imagen puede pesar hasta 5 MB.', status: 413 };
  }

  const nombre = `${randomUUID()}.${extension}`;
  await mkdir(DIR_ARCHIVOS, { recursive: true });
  await writeFile(path.join(DIR_ARCHIVOS, nombre), Buffer.from(await archivo.arrayBuffer()));
  return { ok: true, nombre, url: `/api/archivos/${nombre}` };
}

const TIPOS_VIDEO: Record<string, string> = {
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  // Lo que graba el iPhone: los navegadores lo reproducen si el códec es H.264.
  'video/quicktime': 'mov',
};
const MAX_BYTES_VIDEO = 60 * 1024 * 1024;

/** Valida y guarda un clip de video con nombre único. */
export async function guardarVideo(
  archivo: unknown
): Promise<{ ok: true; nombre: string; url: string } | { ok: false; error: string; status: number }> {
  if (!(archivo instanceof File)) {
    return { ok: false, error: 'Falta el archivo.', status: 400 };
  }
  const extension = TIPOS_VIDEO[archivo.type];
  if (!extension) {
    return { ok: false, error: 'Solo videos MP4, WebM o del iPhone (MOV).', status: 415 };
  }
  if (archivo.size > MAX_BYTES_VIDEO) {
    return { ok: false, error: 'El video puede pesar hasta 60 MB (un clip corto).', status: 413 };
  }

  const nombre = `${randomUUID()}.${extension}`;
  await mkdir(DIR_ARCHIVOS, { recursive: true });
  await writeFile(path.join(DIR_ARCHIVOS, nombre), Buffer.from(await archivo.arrayBuffer()));
  return { ok: true, nombre, url: `/api/archivos/${nombre}` };
}
