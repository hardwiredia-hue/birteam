import path from 'path';

/**
 * Carpeta de fotos subidas. Fuera del control de git: el deploy hace
 * checkout -f pero no toca lo no versionado, así que sobrevive versiones.
 */
export const DIR_ARCHIVOS =
  process.env.ARCHIVOS_DIR ?? path.join(process.cwd(), 'archivos-subidos');
