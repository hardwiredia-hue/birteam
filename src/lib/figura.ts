import { prisma } from './db';

/**
 * Figura del partido: votan los que fueron (no a sí mismos), desde que
 * arranca el partido hasta 72 h después. El resultado se muestra al cerrar
 * la votación. Para que cuente en el perfil hacen falta al menos 2 votos.
 */

export const HORAS_VOTACION = 72;
export const VOTOS_MINIMOS = 2;

export function estadoVotacion(partido: { fecha: Date; estado: string }, ahora = new Date()) {
  if (partido.estado === 'CANCELADO' || partido.fecha > ahora) return 'NO_EMPEZO' as const;
  return ahora.getTime() - partido.fecha.getTime() < HORAS_VOTACION * 3600_000 ? ('ABIERTA' as const) : ('CERRADA' as const);
}

/** Los más votados (empate: todos los que comparten el máximo). */
export function contarVotos(votos: { elegidoId: string }[]) {
  const conteo = new Map<string, number>();
  for (const voto of votos) conteo.set(voto.elegidoId, (conteo.get(voto.elegidoId) ?? 0) + 1);
  const maximo = Math.max(0, ...conteo.values());
  return {
    conteo,
    maximo,
    ganadores: maximo > 0 ? [...conteo].filter(([, cantidad]) => cantidad === maximo).map(([id]) => id) : [],
  };
}

/** Quiénes pueden votar y ser votados: confirmados que no quedaron como ausentes. */
export function jugaron<T extends { estado: string; asistio: boolean | null }>(participaciones: T[]) {
  return participaciones.filter((p) => p.estado === 'VOY' && p.asistio !== false);
}

/** Veces que el jugador fue la figura (votaciones cerradas, con el mínimo de votos). */
export async function vecesFigura(usuarioId: string) {
  const recibidos = await prisma.votoFigura.findMany({
    where: { elegidoId: usuarioId, partido: { fecha: { lt: new Date(Date.now() - HORAS_VOTACION * 3600_000) } } },
    select: { partidoId: true },
    distinct: ['partidoId'],
  });
  if (recibidos.length === 0) return 0;
  const votos = await prisma.votoFigura.findMany({
    where: { partidoId: { in: recibidos.map((r) => r.partidoId) } },
    select: { partidoId: true, elegidoId: true },
  });
  let veces = 0;
  for (const { partidoId } of recibidos) {
    const { ganadores, maximo } = contarVotos(votos.filter((v) => v.partidoId === partidoId));
    if (maximo >= VOTOS_MINIMOS && ganadores.includes(usuarioId)) veces++;
  }
  return veces;
}
