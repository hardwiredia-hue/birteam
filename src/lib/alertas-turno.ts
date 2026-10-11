import { prisma } from './db';
import {
  ESTADOS_ACTIVOS,
  MINUTOS_ANTICIPACION,
  avisarReserva,
  inicioDelTurno,
  rotuloDia,
  seSuperponen,
} from './reservas';

/** Alertas "avisame si se libera" pendientes que puede tener un jugador. */
export const MAXIMO_ALERTAS = 10;

/**
 * Se liberó un turno (cancelado, rechazado, vencido o una semana de un fijo):
 * si de verdad quedó libre y todavía se puede pedir, avisa a todos los que
 * lo esperaban. Cada alerta se marca antes de avisar, así nadie recibe el
 * mismo aviso dos veces aunque se libere de nuevo.
 */
export async function avisarTurnoLibre(canchaId: string, fecha: string, hora: string) {
  const inicio = inicioDelTurno(fecha, hora);
  if (inicio.getTime() < Date.now() + MINUTOS_ANTICIPACION * 60_000) return 0;

  const esperando = await prisma.alertaTurno.findMany({
    where: { canchaId, fecha, hora, avisadoEn: null },
    select: { id: true, usuarioId: true },
  });
  if (esperando.length === 0) return 0;

  const cancha = await prisma.cancha.findUnique({
    where: { id: canchaId },
    select: { id: true, nombre: true, duracionTurno: true, activa: true, reservasOnline: true },
  });
  if (!cancha || !cancha.activa || !cancha.reservasOnline) return 0;

  // Puede haberlo tomado otro (o un turno fijo) en el mismo momento.
  const delDia = await prisma.reserva.findMany({
    where: { canchaId, fecha, estado: { in: ESTADOS_ACTIVOS } },
    select: { inicio: true, duracion: true },
  });
  if (delDia.some((r) => seSuperponen(inicio.getTime(), cancha.duracionTurno, r.inicio.getTime(), r.duracion))) {
    return 0;
  }

  const { count } = await prisma.alertaTurno.updateMany({
    where: { id: { in: esperando.map((a) => a.id) }, avisadoEn: null },
    data: { avisadoEn: new Date() },
  });
  if (count === 0) return 0;

  for (const alerta of esperando) {
    await avisarReserva(
      alerta.usuarioId,
      'TURNO_LIBRE',
      `Se liberó tu turno · ${cancha.nombre}`,
      `El ${rotuloDia(fecha)} a las ${hora} quedó libre. Pedilo antes que otro.`,
      `/canchas/${cancha.id}?fecha=${fecha}&hora=${hora}`
    );
  }
  return esperando.length;
}
