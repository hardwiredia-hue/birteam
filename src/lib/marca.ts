import { cache } from 'react';
import { prisma } from './db';

/**
 * Marca del sitio: logo, ícono y favicon. Por defecto los archivos del repo;
 * desde el backoffice (Marca) se pueden reemplazar sin tocar código: el valor
 * queda en la tabla Ajuste apuntando a un archivo subido.
 */

export const CLAVES_MARCA = ['logo_oscuro', 'logo_claro', 'icono', 'favicon'] as const;
export type ClaveMarca = (typeof CLAVES_MARCA)[number];

const DEFECTO = {
  logo_oscuro: '/birteam-blanco.png',
  logo_claro: '/birteam-negro.png',
  icono: '/icono-512.png',
  favicon: '/birteam-iso.png',
};

export interface Marca {
  logoOscuro: string;
  logoClaro: string;
  /** Ícono de la app (manifest y apple-touch). */
  icono512: string;
  icono192: string;
  favicon: string;
  /** Qué claves tienen un archivo propio subido (para el backoffice). */
  personalizada: Record<ClaveMarca, string | null>;
}

/** Una consulta por pedido (React cache); si la base falla, marca de fábrica. */
export const obtenerMarca = cache(async (): Promise<Marca> => {
  let filas: { clave: string; valor: string }[] = [];
  try {
    filas = await prisma.ajuste.findMany({ where: { clave: { in: [...CLAVES_MARCA] } } });
  } catch {
    filas = [];
  }
  const propios = Object.fromEntries(filas.map((fila) => [fila.clave, fila.valor])) as Partial<
    Record<ClaveMarca, string>
  >;

  return {
    logoOscuro: propios.logo_oscuro ?? DEFECTO.logo_oscuro,
    logoClaro: propios.logo_claro ?? DEFECTO.logo_claro,
    icono512: propios.icono ?? DEFECTO.icono,
    icono192: propios.icono ?? '/icono-192.png',
    favicon: propios.favicon ?? DEFECTO.favicon,
    personalizada: {
      logo_oscuro: propios.logo_oscuro ?? null,
      logo_claro: propios.logo_claro ?? null,
      icono: propios.icono ?? null,
      favicon: propios.favicon ?? null,
    },
  };
});
