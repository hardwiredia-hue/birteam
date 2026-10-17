import { prisma } from './db';
import { enviarPush } from './push';
import { RADIO_MAXIMO_AVISOS_KM, posiblesVecinos, vecinosDe } from './cercania';
import { puedeJugar } from './disponibilidad';

/**
 * Invitar a alguien a un partido que ya está armado (desde su perfil).
 * Puede invitar quien organiza o co-organiza, o un confirmado si el partido
 * es abierto. La invitación es un aviso: se responde desde Inicio.
 */

const ZONA = 'America/Argentina/Buenos_Aires';

export interface PartidoParaInvitar {
  id: string;
  titulo: string;
  lugar: string;
  faltan: number;
}

function rotulo(deporte: string, fecha: Date) {
  const dia = fecha.toLocaleDateString('es-AR', { weekday: 'long', timeZone: ZONA });
  const hora = fecha.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: ZONA });
  return `${deporte} · ${dia} ${hora}`;
}

/** Hay un bloqueo entre los dos (en cualquier sentido). */
async function bloqueados(a: string, b: string) {
  const bloqueo = await prisma.bloqueo.findFirst({
    where: {
      OR: [
        { bloqueadorId: a, bloqueadoId: b },
        { bloqueadorId: b, bloqueadoId: a },
      ],
    },
    select: { bloqueadorId: true },
  });
  return bloqueo != null;
}

/** Mis próximos partidos a los que puedo invitar a esta persona. */
export async function partidosParaInvitar(yoId: string, invitadoId: string): Promise<PartidoParaInvitar[]> {
  if (yoId === invitadoId || (await bloqueados(yoId, invitadoId))) return [];
  const partidos = await prisma.partido.findMany({
    where: {
      fecha: { gt: new Date() },
      estado: { in: ['ARMANDOSE', 'CONFIRMADO'] },
      listaCerrada: false,
      participaciones: { none: { usuarioId: invitadoId } },
      OR: [
        { organizadorId: yoId },
        { coOrganizadorId: yoId },
        { visibilidad: 'ABIERTO', participaciones: { some: { usuarioId: yoId, estado: 'VOY' } } },
      ],
    },
    include: {
      deporte: { select: { nombre: true } },
      participaciones: { where: { estado: 'VOY' }, select: { id: true } },
    },
    orderBy: { fecha: 'asc' },
    take: 10,
  });
  return partidos.map((p) => ({
    id: p.id,
    titulo: rotulo(p.deporte.nombre, p.fecha),
    lugar: p.lugarNombre,
    faltan: Math.max(0, p.cupo - p.participaciones.length),
  }));
}

/** Manda la invitación. Devuelve un error para mostrar, o null si salió. */
export async function invitarAPartido(yo: { id: string; nombre: string }, partidoId: string, invitadoId: string) {
  const posibles = await partidosParaInvitar(yo.id, invitadoId);
  const partido = posibles.find((p) => p.id === partidoId);
  if (!partido) return 'No podés invitar a esa persona a ese partido.';

  const url = `/partidos/${partidoId}`;
  const yaInvitado = await prisma.notificacion.findFirst({
    where: { usuarioId: invitadoId, tipo: 'INVITACION', url },
    select: { id: true },
  });
  if (yaInvitado) return 'Ya lo invitaste a este partido.';

  const aviso = {
    titulo: `${yo.nombre.split(' ')[0]} te invitó: ${partido.titulo}`,
    cuerpo: `En ${partido.lugar}. ${partido.faltan > 0 ? `Faltan ${partido.faltan}. ` : ''}Respondé desde Inicio.`,
    url,
  };
  await prisma.notificacion.create({ data: { usuarioId: invitadoId, tipo: 'INVITACION', ...aviso } });
  await enviarPush(invitadoId, aviso);
  return null;
}

/**
 * "Pueden venir": jugadores de ese deporte, cerca del partido, que marcaron
 * que pueden ese día y franja. Para que el organizador complete la lista
 * invitando de un toque. Sin los que ya están anotados o invitados, ni
 * bloqueados ni cuentas cerradas. Los más cerca primero.
 */
export async function sugeridosParaPartido(partidoId: string, limite = 6) {
  const partido = await prisma.partido.findUnique({
    where: { id: partidoId },
    select: {
      id: true,
      deporteId: true,
      organizadorId: true,
      fecha: true,
      ciudad: true,
      latitud: true,
      longitud: true,
      participaciones: { select: { usuarioId: true } },
    },
  });
  if (!partido) return [];
  const zona = posiblesVecinos(partido);
  if (!zona) return [];
  const [bloqueos, invitados] = await Promise.all([
    prisma.bloqueo.findMany({
      where: { OR: [{ bloqueadorId: partido.organizadorId }, { bloqueadoId: partido.organizadorId }] },
      select: { bloqueadorId: true, bloqueadoId: true },
    }),
    prisma.notificacion.findMany({
      where: { tipo: 'INVITACION', url: `/partidos/${partido.id}` },
      select: { usuarioId: true },
    }),
  ]);
  const excluidos = [
    partido.organizadorId,
    ...partido.participaciones.map((p) => p.usuarioId),
    ...bloqueos.flatMap((b) => [b.bloqueadorId, b.bloqueadoId]),
    ...invitados.map((n) => n.usuarioId),
  ];
  const candidatos = await prisma.usuario.findMany({
    where: {
      id: { notIn: excluidos },
      eliminadoEn: null,
      disponibilidad: { not: '[]' },
      deportes: { some: { deporteId: partido.deporteId } },
      ...zona,
    },
    select: { id: true, nombre: true, usuario: true, avatarUrl: true, ciudad: true, latitud: true, longitud: true, radioKm: true, disponibilidad: true },
    take: 300,
  });
  return vecinosDe(
    candidatos.filter((c) => puedeJugar(c.disponibilidad, partido.fecha)).map((c) => ({ ...c, radioKm: RADIO_MAXIMO_AVISOS_KM })),
    partido,
    limite
  ).map(({ id, nombre, usuario, avatarUrl }) => ({ id, nombre, usuario, avatarUrl }));
}
