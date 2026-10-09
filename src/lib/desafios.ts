import { prisma } from './db';
import { enviarPush } from './push';

export const ESTADOS_DESAFIO: Record<string, string> = {
  PENDIENTE: 'Esperando respuesta',
  ACEPTADO: 'Aceptado',
  RECHAZADO: 'Rechazado',
  CANCELADO: 'Cancelado',
};

/** Los grupos donde el usuario es admin: desde ahí se desafía y se responde. */
export function gruposQueAdministro(usuarioId: string) {
  return prisma.grupo.findMany({
    where: { miembros: { some: { usuarioId, rol: 'ADMIN' } } },
    select: { id: true, nombre: true, deporteId: true, ciudad: true },
    orderBy: { nombre: 'asc' },
  });
}

export async function adminsDelGrupo(grupoId: string) {
  const admins = await prisma.miembroGrupo.findMany({
    where: { grupoId, rol: 'ADMIN' },
    select: { usuarioId: true },
  });
  return admins.map((admin) => admin.usuarioId);
}

/** Aviso en la campanita + push para varios a la vez. */
export async function avisar(
  usuarioIds: string[],
  tipo: string,
  titulo: string,
  cuerpo: string,
  url: string
) {
  const ids = [...new Set(usuarioIds)];
  if (ids.length === 0) return;
  await prisma.notificacion.createMany({
    data: ids.map((usuarioId) => ({ usuarioId, tipo, titulo, cuerpo, url })),
  });
  await enviarPush(ids, { titulo, cuerpo, url });
}

/** "sáb 10 oct 21:00" en hora argentina. */
export function rotuloFecha(fecha: Date) {
  const zona = 'America/Argentina/Buenos_Aires';
  const dia = fecha.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short', timeZone: zona });
  const hora = fecha.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: zona });
  return `${dia.replace(',', '')} ${hora}`;
}
