import { prisma } from './db';

/**
 * Quién gestiona los turnos de un complejo: el dueño y sus empleados. Los
 * empleados no tocan precios, Radar, cobros ni la publicación de canchas.
 */

/** Dueños cuyas canchas gestiona este usuario (él mismo si es dueño, y sus empleadores). */
export async function duenosQueGestiono(usuarioId: string, tipoCuenta?: string) {
  const empleos = await prisma.empleadoComplejo.findMany({
    where: { usuarioId, dueno: { eliminadoEn: null } },
    select: { duenoId: true },
  });
  const ids = empleos.map((e) => e.duenoId);
  return tipoCuenta === 'CANCHA' ? [usuarioId, ...ids] : ids;
}

export async function gestionaCancha(usuarioId: string, cancha: { duenoId: string }) {
  if (cancha.duenoId === usuarioId) return true;
  const empleo = await prisma.empleadoComplejo.findUnique({
    where: { duenoId_usuarioId: { duenoId: cancha.duenoId, usuarioId } },
    select: { id: true },
  });
  return Boolean(empleo);
}

/** El dueño y sus empleados: a quiénes avisar de lo que pasa con los turnos. */
export async function equipoDelComplejo(duenoId: string) {
  const empleados = await prisma.empleadoComplejo.findMany({
    where: { duenoId, usuario: { eliminadoEn: null } },
    select: { usuarioId: true },
  });
  return [duenoId, ...empleados.map((e) => e.usuarioId)];
}
