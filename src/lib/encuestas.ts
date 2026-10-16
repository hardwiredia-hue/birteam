import { prisma } from './db';
import { enviarPush } from './push';

/**
 * "¿Cuándo jugamos?" en un grupo: alguien propone de 2 a 5 días y horarios,
 * cada uno marca los que puede y con el más votado se arma el partido.
 * Una encuesta abierta por grupo; cuando pasan todos sus horarios, se da
 * por terminada sola.
 */

export const MINIMO_OPCIONES = 2;
export const MAXIMO_OPCIONES = 5;
const ZONA = 'America/Argentina/Buenos_Aires';

/** "jue 23 oct 21:00" en hora argentina. */
export function rotuloOpcion(fecha: Date) {
  const dia = fecha.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short', timeZone: ZONA });
  const hora = fecha.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: ZONA });
  return `${dia.replace(/\./g, '').replace(',', '')} ${hora}`;
}

/** La encuesta abierta del grupo (con algún horario por venir), con votos. */
export async function encuestaAbierta(grupoId: string, ahora = new Date()) {
  const encuesta = await prisma.encuesta.findFirst({
    where: { grupoId, cerradaEn: null, opciones: { some: { fecha: { gt: ahora } } } },
    include: {
      creador: { select: { id: true, nombre: true } },
      opciones: {
        orderBy: { fecha: 'asc' },
        include: { votos: { include: { usuario: { select: { id: true, nombre: true } } }, orderBy: { creadoEn: 'asc' } } },
      },
    },
    orderBy: { creadoEn: 'desc' },
  });
  return encuesta;
}

async function miembro(grupoId: string, usuarioId: string) {
  return prisma.miembroGrupo.findUnique({ where: { grupoId_usuarioId: { grupoId, usuarioId } } });
}

/** Proponer horarios. Devuelve el id o un error para mostrar. */
export async function crearEncuesta(
  usuario: { id: string; nombre: string },
  grupoId: string,
  fechas: Date[],
  ahora = new Date()
): Promise<{ id: string } | { error: string }> {
  if (!(await miembro(grupoId, usuario.id))) return { error: 'Proponen los del grupo.' };
  const unicas = [...new Set(fechas.map((f) => f.getTime()))].map((t) => new Date(t)).sort((a, b) => a.getTime() - b.getTime());
  if (unicas.length < MINIMO_OPCIONES) return { error: `Proponé al menos ${MINIMO_OPCIONES} horarios distintos.` };
  if (unicas.length > MAXIMO_OPCIONES) return { error: `Hasta ${MAXIMO_OPCIONES} horarios.` };
  if (unicas.some((f) => f <= ahora)) return { error: 'Los horarios tienen que ser a futuro.' };
  if (await encuestaAbierta(grupoId, ahora)) return { error: 'Ya hay una encuesta abierta en el grupo.' };

  const encuesta = await prisma.encuesta.create({
    data: { grupoId, creadorId: usuario.id, opciones: { create: unicas.map((fecha) => ({ fecha })) } },
  });

  const grupo = await prisma.grupo.findUniqueOrThrow({
    where: { id: grupoId },
    select: { nombre: true, miembros: { where: { usuarioId: { not: usuario.id }, usuario: { eliminadoEn: null } }, select: { usuarioId: true } } },
  });
  const ids = grupo.miembros.map((m) => m.usuarioId);
  if (ids.length > 0) {
    const titulo = `¿Cuándo jugamos? · ${grupo.nombre}`;
    const cuerpo = `${usuario.nombre.split(' ')[0]} propuso ${unicas.length} horarios. Marcá los que podés.`;
    const url = `/grupos/${grupoId}#cuando`;
    await prisma.notificacion.createMany({
      data: ids.map((usuarioId) => ({ usuarioId, tipo: 'ENCUESTA', titulo, cuerpo, url, expiraEn: unicas[unicas.length - 1] })),
    });
    await enviarPush(ids, { titulo, cuerpo, url });
  }
  return { id: encuesta.id };
}

/** Marcar los horarios que puedo (reemplaza lo que había marcado). */
export async function votar(usuarioId: string, encuestaId: string, opcionIds: string[], ahora = new Date()) {
  const encuesta = await prisma.encuesta.findUnique({ where: { id: encuestaId }, include: { opciones: true } });
  if (!encuesta || encuesta.cerradaEn) return 'La encuesta ya cerró.';
  if (!(await miembro(encuesta.grupoId, usuarioId))) return 'Votan los del grupo.';
  const validas = new Set(encuesta.opciones.filter((o) => o.fecha > ahora).map((o) => o.id));
  const elegidas = [...new Set(opcionIds)].filter((id) => validas.has(id));
  await prisma.$transaction([
    prisma.votoEncuesta.deleteMany({ where: { usuarioId, opcion: { encuestaId } } }),
    prisma.votoEncuesta.createMany({ data: elegidas.map((opcionId) => ({ opcionId, usuarioId })) }),
  ]);
  return null;
}

/** Cierran quien la propuso o un admin del grupo. */
export async function puedeCerrar(usuarioId: string, encuesta: { grupoId: string; creadorId: string }) {
  if (encuesta.creadorId === usuarioId) return true;
  return (await miembro(encuesta.grupoId, usuarioId))?.rol === 'ADMIN';
}

export async function cerrarEncuesta(usuarioId: string, encuestaId: string, partidoId: string | null = null) {
  const encuesta = await prisma.encuesta.findUnique({ where: { id: encuestaId } });
  if (!encuesta || encuesta.cerradaEn) return 'La encuesta ya cerró.';
  if (!(await puedeCerrar(usuarioId, encuesta))) return 'La cierra quien la propuso o un admin.';
  await prisma.encuesta.update({ where: { id: encuestaId }, data: { cerradaEn: new Date(), partidoId } });
  return null;
}
