import { prisma } from './db';
import { enviarPush } from './push';

/**
 * Después del partido: un recordatorio al organizador para pasar lista y
 * cargar el resultado, y si nunca lo hace, a las 48 h se da por jugado
 * (los que iban, como que fueron: igual que los turnos sin "No vino").
 * Así las estadísticas, el ranking y la métrica de partidos jugados no
 * dependen de que alguien se acuerde.
 */

/** Recordatorio: desde que termina hasta 6 h después. */
const HORAS_RECORDATORIO = 6;
/** Sin lista, se cierra solo a las 48 h de terminado. */
export const HORAS_CIERRE = 48;
/** No se tocan partidos más viejos que esto (los de antes de esta función). */
const DIAS_MAXIMO = 60;
const ZONA = 'America/Argentina/Buenos_Aires';

const fin = (p: { fecha: Date; duracionMin: number }) => p.fecha.getTime() + p.duracionMin * 60_000;

export async function recordarPasarLista(ahora = new Date()) {
  const partidos = await prisma.partido.findMany({
    where: {
      estado: { in: ['ARMANDOSE', 'CONFIRMADO'] },
      fecha: { gte: new Date(ahora.getTime() - (HORAS_RECORDATORIO + 4) * 3600_000), lte: ahora },
    },
    include: { deporte: { select: { nombre: true } }, participaciones: { where: { estado: 'VOY' }, select: { id: true } } },
  });
  let enviados = 0;
  for (const partido of partidos) {
    const terminado = ahora.getTime() - fin(partido);
    if (terminado < 0 || terminado > HORAS_RECORDATORIO * 3600_000) continue;
    if (partido.participaciones.length < 2) continue;
    const url = `/partidos/${partido.id}#lista`;
    const ya = await prisma.notificacion.findFirst({
      where: { usuarioId: partido.organizadorId, tipo: 'PASAR_LISTA', url },
      select: { id: true },
    });
    if (ya) continue;
    const dia = partido.fecha.toLocaleDateString('es-AR', { weekday: 'long', timeZone: ZONA });
    const titulo = `¿Cómo salió el ${partido.deporte.nombre} del ${dia}?`;
    const cuerpo = 'Pasá lista y cargá el resultado: suma a las estadísticas de todos y abre la votación de la figura.';
    await prisma.notificacion.create({ data: { usuarioId: partido.organizadorId, tipo: 'PASAR_LISTA', titulo, cuerpo, url } });
    await enviarPush(partido.organizadorId, { titulo, cuerpo, url });
    enviados++;
  }
  return enviados;
}

export async function cerrarPartidosSinLista(ahora = new Date()) {
  const partidos = await prisma.partido.findMany({
    where: {
      estado: { in: ['ARMANDOSE', 'CONFIRMADO'] },
      fecha: { gte: new Date(ahora.getTime() - DIAS_MAXIMO * 86400_000), lte: new Date(ahora.getTime() - HORAS_CIERRE * 3600_000) },
    },
    include: { participaciones: { where: { estado: 'VOY' }, select: { id: true } } },
    take: 200,
  });
  let cerrados = 0;
  for (const partido of partidos) {
    if (ahora.getTime() - fin(partido) < HORAS_CIERRE * 3600_000) continue;
    // Sin el mínimo de confirmados, no se sabe si se jugó: queda como está.
    if (partido.participaciones.length < Math.max(2, partido.minimo)) continue;
    await prisma.$transaction([
      prisma.participacion.updateMany({
        where: { partidoId: partido.id, estado: 'VOY', asistio: null },
        data: { asistio: true },
      }),
      prisma.partido.update({ where: { id: partido.id }, data: { estado: 'JUGADO' } }),
    ]);
    cerrados++;
  }
  return cerrados;
}
