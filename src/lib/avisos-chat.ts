import { prisma } from './db';
import { enviarPush } from './push';
import { idsBloqueados } from './bloqueos';

/**
 * Avisos de la charla de un partido o un grupo. Para no acribillar a nadie:
 * un solo aviso por charla hasta que la leés. Si llegan más mensajes, el
 * mismo aviso se actualiza (sin otra notificación al celular).
 */

const ZONA = 'America/Argentina/Buenos_Aires';
/** Un partido que pasó hace más que esto ya no avisa por su charla. */
const HORAS_DESPUES_DEL_PARTIDO = 24;

export const urlChatPartido = (partidoId: string) => `/partidos/${partidoId}#charla`;
export const urlChatGrupo = (grupoId: string) => `/grupos/${grupoId}#charla`;

function recorte(texto: string) {
  return texto.length > 90 ? `${texto.slice(0, 90)}…` : texto;
}

/** A quién avisar y con qué título; null si esa charla no avisa. */
async function destinatarios(autorId: string, chat: { partidoId?: string | null; grupoId?: string | null }) {
  if (chat.partidoId) {
    const partido = await prisma.partido.findUnique({
      where: { id: chat.partidoId },
      include: {
        deporte: { select: { nombre: true } },
        participaciones: { where: { estado: { in: ['VOY', 'TALVEZ', 'ESPERA'] } }, select: { usuarioId: true } },
      },
    });
    if (!partido || partido.estado === 'CANCELADO') return null;
    if (partido.fecha.getTime() < Date.now() - HORAS_DESPUES_DEL_PARTIDO * 3600_000) return null;
    const dia = partido.fecha.toLocaleDateString('es-AR', { weekday: 'long', timeZone: ZONA });
    return {
      ids: [partido.organizadorId, partido.coOrganizadorId, ...partido.participaciones.map((p) => p.usuarioId)],
      titulo: `Charla del ${partido.deporte.nombre} del ${dia}`,
      url: urlChatPartido(partido.id),
    };
  }
  if (chat.grupoId) {
    const grupo = await prisma.grupo.findUnique({
      where: { id: chat.grupoId },
      select: { id: true, nombre: true, miembros: { select: { usuarioId: true } } },
    });
    if (!grupo) return null;
    return { ids: grupo.miembros.map((m) => m.usuarioId), titulo: `Charla de ${grupo.nombre}`, url: urlChatGrupo(grupo.id) };
  }
  return null;
}

export async function avisarMensajeDeChat(
  autor: { id: string; nombre: string },
  chat: { partidoId?: string | null; grupoId?: string | null },
  texto: string
) {
  const datos = await destinatarios(autor.id, chat);
  if (!datos) return { nuevos: 0, actualizados: 0 };
  const ocultos = new Set(await idsBloqueados(autor.id));
  const candidatos = [...new Set(datos.ids)].filter((id): id is string => Boolean(id) && id !== autor.id && !ocultos.has(id!));
  const ids = (
    await prisma.usuario.findMany({
      where: { id: { in: candidatos }, eliminadoEn: null, avisosChats: true },
      select: { id: true },
    })
  ).map((u) => u.id);
  if (ids.length === 0) return { nuevos: 0, actualizados: 0 };

  const cuerpo = `${autor.nombre.split(' ')[0]}: ${recorte(texto)}`;
  const pendientes = await prisma.notificacion.findMany({
    where: { usuarioId: { in: ids }, tipo: 'CHAT', url: datos.url, leidaEn: null },
    select: { usuarioId: true },
  });
  const conAviso = new Set(pendientes.map((n) => n.usuarioId));
  const nuevos = ids.filter((id) => !conAviso.has(id));

  if (conAviso.size > 0) {
    // Sigue sin leer: se actualiza el mismo aviso y sube arriba de la lista.
    await prisma.notificacion.updateMany({
      where: { usuarioId: { in: [...conAviso] }, tipo: 'CHAT', url: datos.url, leidaEn: null },
      data: { titulo: `${datos.titulo}: mensajes nuevos`, cuerpo, creadoEn: new Date() },
    });
  }
  if (nuevos.length > 0) {
    await prisma.notificacion.createMany({
      data: nuevos.map((usuarioId) => ({ usuarioId, tipo: 'CHAT', titulo: datos.titulo, cuerpo, url: datos.url })),
    });
    await enviarPush(nuevos, { titulo: datos.titulo, cuerpo, url: datos.url });
  }
  return { nuevos: nuevos.length, actualizados: conAviso.size };
}

/** Abrir la charla da por leído su aviso. */
export async function marcarChatLeido(usuarioId: string, chat: { partidoId?: string | null; grupoId?: string | null }) {
  const url = chat.partidoId ? urlChatPartido(chat.partidoId) : chat.grupoId ? urlChatGrupo(chat.grupoId) : null;
  if (!url) return;
  await prisma.notificacion.updateMany({
    where: { usuarioId, tipo: 'CHAT', url, leidaEn: null },
    data: { leidaEn: new Date() },
  });
}
