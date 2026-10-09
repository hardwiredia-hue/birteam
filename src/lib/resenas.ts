import { prisma } from './db';

/**
 * ¿Jugó en esta cancha? Solo así puede reseñarla: un turno confirmado que
 * ya pasó, o un partido en esa cancha (ya jugado) donde fue de los que iban.
 */
export async function jugoEnLaCancha(usuarioId: string, canchaId: string) {
  const ahora = new Date();
  const [turno, partido] = await Promise.all([
    prisma.reserva.findFirst({
      where: { usuarioId, canchaId, estado: 'CONFIRMADA', inicio: { lt: ahora } },
      select: { id: true },
    }),
    prisma.participacion.findFirst({
      where: { usuarioId, estado: 'VOY', partido: { canchaId, fecha: { lt: ahora } } },
      select: { id: true },
    }),
  ]);
  return Boolean(turno || partido);
}

/** Promedio y cantidad de reseñas por cancha, para listas. */
export async function puntajesDeCanchas(canchaIds: string[]) {
  if (canchaIds.length === 0) return new Map<string, { promedio: number; cantidad: number }>();
  const filas = await prisma.resenaCancha.groupBy({
    by: ['canchaId'],
    where: { canchaId: { in: canchaIds } },
    _avg: { puntaje: true },
    _count: { _all: true },
  });
  return new Map(
    filas.map((fila) => [
      fila.canchaId,
      { promedio: fila._avg.puntaje ?? 0, cantidad: fila._count._all },
    ])
  );
}

/** "4,5" */
export function formatearPuntaje(promedio: number) {
  return promedio.toFixed(1).replace('.', ',');
}
