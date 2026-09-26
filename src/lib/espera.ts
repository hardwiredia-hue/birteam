import type { Prisma, PrismaClient } from '@prisma/client';
import { HORAS_VENCIMIENTO_ESPERA } from './constantes';

type ClienteOTx = PrismaClient | Prisma.TransactionClient;

function horaCorta(fecha: Date) {
  return fecha.toLocaleTimeString('es-AR', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Argentina/Buenos_Aires',
  });
}

/**
 * Si hay lugar libre y gente en espera, se lo OFRECE al primero de la lista:
 * el lugar queda reservado para él durante 2 horas (invitacionExpiraEn) y le
 * llega el aviso. Si no confirma, la tarea programada lo pasa al siguiente.
 * Idempotente: si no hay lugar, candidatos o el partido ya cerró, no hace nada.
 */
export async function ofrecerLugarLibre(db: ClienteOTx, partidoId: string) {
  const partido = await db.partido.findUnique({
    where: { id: partidoId },
    include: { participaciones: true, deporte: true },
  });
  if (!partido) return null;
  if (partido.estado === 'CANCELADO' || partido.estado === 'JUGADO') return null;
  if (partido.fecha < new Date()) return null;

  const ahora = new Date();
  const confirmados = partido.participaciones.filter((p) => p.estado === 'VOY').length;
  const reservados = partido.participaciones.filter(
    (p) => p.estado === 'ESPERA' && p.invitacionExpiraEn && p.invitacionExpiraEn > ahora
  ).length;
  if (confirmados + reservados >= partido.cupo) return null;

  // El primero de la lista que todavía no tiene una invitación en curso.
  const candidato = partido.participaciones
    .filter((p) => p.estado === 'ESPERA' && !p.invitacionExpiraEn)
    .sort((a, b) => (a.ordenEspera ?? Infinity) - (b.ordenEspera ?? Infinity))[0];
  if (!candidato) return null;

  const hasta = new Date(Date.now() + HORAS_VENCIMIENTO_ESPERA * 3600 * 1000);
  await db.participacion.update({
    where: { id: candidato.id },
    data: { invitacionExpiraEn: hasta },
  });
  await db.notificacion.create({
    data: {
      usuarioId: candidato.usuarioId,
      tipo: 'LUGAR_LIBERADO',
      titulo: `Se liberó un lugar: confirmá antes de las ${horaCorta(hasta)}`,
      cuerpo: `${partido.deporte.nombre} en ${partido.lugarNombre}. Tocá "Voy" o el lugar pasa al siguiente de la lista.`,
      url: `/partidos/${partido.id}`,
      expiraEn: hasta,
    },
  });
  return candidato.usuarioId;
}
