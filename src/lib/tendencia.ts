import { prisma } from './db';

/**
 * La tendencia del backoffice: semana a semana (de 7 días, la última
 * termina ahora), para ver si birteam crece o se estanca.
 */

export const SEMANAS_TENDENCIA = 8;
const SEMANA_MS = 7 * 86400_000;

export interface Semana {
  /** Primer día de la semana ("6 oct"). */
  desde: string;
  valor: number;
}

/** Cuenta las fechas por semana: la última semana es la que termina ahora. */
export function porSemana(fechas: Date[], ahora = new Date(), semanas = SEMANAS_TENDENCIA): Semana[] {
  const inicio = ahora.getTime() - semanas * SEMANA_MS;
  const valores = Array.from({ length: semanas }, () => 0);
  for (const fecha of fechas) {
    const indice = Math.floor((fecha.getTime() - inicio) / SEMANA_MS);
    if (indice >= 0 && indice < semanas) valores[indice]++;
  }
  return valores.map((valor, i) => ({
    desde: new Date(inicio + i * SEMANA_MS).toLocaleDateString('es-AR', {
      day: 'numeric',
      month: 'short',
      timeZone: 'America/Argentina/Buenos_Aires',
    }),
    valor,
  }));
}

export async function tendenciaSemanal(ahora = new Date()) {
  const desde = new Date(ahora.getTime() - SEMANAS_TENDENCIA * SEMANA_MS);
  const [partidos, usuarios, turnos] = await Promise.all([
    prisma.partido.findMany({ where: { estado: 'JUGADO', fecha: { gte: desde, lte: ahora } }, select: { fecha: true } }),
    prisma.usuario.findMany({ where: { creadoEn: { gte: desde } }, select: { creadoEn: true } }),
    prisma.reserva.findMany({
      where: { estado: 'CONFIRMADA', noVino: false, inicio: { gte: desde, lte: ahora } },
      select: { inicio: true },
    }),
  ]);
  return {
    partidos: porSemana(partidos.map((p) => p.fecha), ahora),
    usuarios: porSemana(usuarios.map((u) => u.creadoEn), ahora),
    turnos: porSemana(turnos.map((t) => t.inicio), ahora),
  };
}
