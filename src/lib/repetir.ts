import { Prisma } from '@prisma/client';
import { prisma } from './db';
import { enviarPush } from './push';
import { idsBloqueados } from './bloqueos';

/**
 * Partidos que "se repiten todas las semanas": cuando termina uno, se arma
 * el de la semana siguiente, igual (lugar, hora, cupo, costo, grupo), con el
 * organizador adentro, y se invita al grupo y a los que jugaron.
 *
 * Para cortar la serie: editar el último y destildar "Se repite".
 */

const SEMANA_MS = 7 * 86400_000;
/** Un partido semanal que terminó hace más que esto ya no se repite solo. */
const VENTANA_MS = 8 * 86400_000;
const ZONA = 'America/Argentina/Buenos_Aires';

/** La próxima fecha de la serie que todavía no pasó (misma hora, de a una semana). */
export function siguienteFecha(fecha: Date, ahora = new Date()) {
  let siguiente = fecha.getTime() + SEMANA_MS;
  while (siguiente <= ahora.getTime()) siguiente += SEMANA_MS;
  return new Date(siguiente);
}

export async function repetirSemanales(ahora = new Date()) {
  const candidatos = await prisma.partido.findMany({
    where: {
      recurrenteSemanal: true,
      repeticion: { is: null },
      fecha: { gte: new Date(ahora.getTime() - VENTANA_MS), lte: ahora },
      organizador: { eliminadoEn: null },
    },
    include: {
      deporte: { select: { nombre: true } },
      organizador: { select: { nombre: true } },
      participaciones: { where: { estado: 'VOY' }, select: { usuarioId: true } },
      grupo: { select: { miembros: { select: { usuarioId: true } } } },
    },
    take: 100,
  });

  let creados = 0;
  for (const anterior of candidatos) {
    // Recién cuando termina (si no, el de esta semana todavía está en juego).
    if (anterior.fecha.getTime() + anterior.duracionMin * 60_000 > ahora.getTime()) continue;

    const fecha = siguienteFecha(anterior.fecha, ahora);
    let nuevo;
    try {
      nuevo = await prisma.partido.create({
        data: {
          repetidoDeId: anterior.id,
          deporteId: anterior.deporteId,
          grupoId: anterior.grupoId,
          organizadorId: anterior.organizadorId,
          coOrganizadorId: anterior.coOrganizadorId,
          fecha,
          duracionMin: anterior.duracionMin,
          recurrenteSemanal: true,
          lugarNombre: anterior.lugarNombre,
          direccion: anterior.direccion,
          lugarTelefono: anterior.lugarTelefono,
          canchaId: anterior.canchaId,
          nivel: anterior.nivel,
          ciudad: anterior.ciudad,
          provincia: anterior.provincia,
          pais: anterior.pais,
          latitud: anterior.latitud,
          longitud: anterior.longitud,
          cupo: anterior.cupo,
          minimo: anterior.minimo,
          costoPorJugador: anterior.costoPorJugador,
          moneda: anterior.moneda,
          visibilidad: anterior.visibilidad,
          notas: anterior.notas,
          participaciones: { create: { usuarioId: anterior.organizadorId, estado: 'VOY' } },
        },
      });
    } catch (error) {
      // Otra corrida del cron ya lo armó.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') continue;
      throw error;
    }
    creados++;

    const dia = fecha.toLocaleDateString('es-AR', { weekday: 'long', timeZone: ZONA });
    const hora = fecha.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: ZONA });
    const ocultos = new Set(await idsBloqueados(anterior.organizadorId));
    const posibles = [
      ...new Set([
        ...(anterior.grupo?.miembros.map((m) => m.usuarioId) ?? []),
        ...anterior.participaciones.map((p) => p.usuarioId),
      ]),
    ].filter((id) => id !== anterior.organizadorId && !ocultos.has(id));
    const invitados = (
      await prisma.usuario.findMany({ where: { id: { in: posibles }, eliminadoEn: null }, select: { id: true } })
    ).map((u) => u.id);

    const titulo = `${anterior.deporte.nombre} el ${dia} ${hora}: ¿vas?`;
    const cuerpo = `${anterior.organizador.nombre.split(' ')[0]} lo juega todas las semanas en ${anterior.lugarNombre}. Confirmá si vas.`;
    const url = `/partidos/${nuevo.id}`;
    if (invitados.length > 0) {
      await prisma.notificacion.createMany({
        data: invitados.map((usuarioId) => ({ usuarioId, tipo: 'INVITACION', titulo, cuerpo, url, expiraEn: fecha })),
      });
      await enviarPush(invitados, { titulo, cuerpo, url });
    }
    await prisma.notificacion.create({
      data: {
        usuarioId: anterior.organizadorId,
        tipo: 'PARTIDO_REPETIDO',
        titulo: `Ya está el partido del ${dia} que viene`,
        cuerpo: `Igual que el anterior${invitados.length > 0 ? `; avisamos a ${invitados.length} ${invitados.length === 1 ? 'jugador' : 'jugadores'}` : ''}.${
          anterior.canchaId ? ' Acordate de reservar la cancha.' : ''
        } Si esa semana no se juega, cancelalo.`,
        url,
      },
    });
  }
  return creados;
}
