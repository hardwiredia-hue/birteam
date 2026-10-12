import { prisma } from './db';
import { normalizar } from './normalizar';

export interface Coordenadas {
  latitud: number;
  longitud: number;
}

/**
 * Dónde queda un partido, para medir distancias: el punto exacto de la
 * cancha si se juega en una publicada; si no, el centro de su ciudad (sirve
 * para "a 3 km" y para el filtro de distancia aunque no sea exacto).
 */
export async function coordenadasDelLugar(lugar: {
  canchaId?: string | null;
  ciudad?: string | null;
  provincia?: string | null;
}): Promise<Coordenadas | null> {
  if (lugar.canchaId) {
    const cancha = await prisma.cancha.findUnique({
      where: { id: lugar.canchaId },
      select: { latitud: true, longitud: true },
    });
    if (cancha?.latitud != null && cancha.longitud != null) {
      return { latitud: cancha.latitud, longitud: cancha.longitud };
    }
  }
  if (!lugar.ciudad) return null;
  // Hay ciudades con el mismo nombre en varias provincias: si viene la
  // provincia, manda; si no, la primera que tenga coordenadas.
  const ciudades = await prisma.ciudad.findMany({
    where: { nombreNorm: normalizar(lugar.ciudad), latitud: { not: null }, longitud: { not: null } },
    select: { latitud: true, longitud: true, provincia: { select: { nombre: true } } },
    take: 20,
  });
  const provincia = lugar.provincia ? normalizar(lugar.provincia) : null;
  const elegida =
    (provincia && ciudades.find((c) => normalizar(c.provincia.nombre) === provincia)) || ciudades[0];
  return elegida ? { latitud: elegida.latitud!, longitud: elegida.longitud! } : null;
}

/**
 * Partidos por jugarse que todavía no tienen coordenadas (los creados antes
 * de guardarlas): se completan de a poco desde la tarea programada. Solo
 * llena lo vacío; no toca los que ya tienen.
 */
export async function completarCoordenadasDePartidos(limite = 100) {
  const pendientes = await prisma.partido.findMany({
    where: {
      latitud: null,
      fecha: { gt: new Date() },
      estado: { in: ['ARMANDOSE', 'CONFIRMADO'] },
      OR: [{ canchaId: { not: null } }, { ciudad: { not: null } }],
    },
    select: { id: true, canchaId: true, ciudad: true, provincia: true },
    orderBy: { fecha: 'asc' },
    take: limite,
  });
  let completados = 0;
  for (const partido of pendientes) {
    const coordenadas = await coordenadasDelLugar(partido);
    if (!coordenadas) continue;
    const { count } = await prisma.partido.updateMany({
      where: { id: partido.id, latitud: null },
      data: coordenadas,
    });
    completados += count;
  }
  return completados;
}
