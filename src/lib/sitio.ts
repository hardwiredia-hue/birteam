import { cache } from 'react';
import { prisma } from './db';

/**
 * Modo "En construcción": se prende y apaga desde el backoffice (Marca).
 * Con el modo activo, el sitio muestra la pantalla de obra para todos menos
 * los administradores; /entrar sigue abierto para poder apagarlo.
 */
export const sitioEnConstruccion = cache(async () => {
  try {
    const ajuste = await prisma.ajuste.findUnique({ where: { clave: 'en_construccion' } });
    return ajuste?.valor === '1';
  } catch {
    return false;
  }
});
