import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { ofrecerLugarLibre } from '@/lib/espera';
import { enviarPush } from '@/lib/push';

/**
 * Tareas programadas (las corre el cron del servidor cada 10 minutos, ver
 * deploy/PUBLICAR.md). Protegido con la clave TAREAS_CLAVE del ambiente.
 *
 * 1. Vence invitaciones de la lista de espera (2 h sin contestar → el
 *    lugar pasa al siguiente y el vencido va al final de la cola).
 * 2. Recordatorio 24 h antes a los "tal vez" y a los del grupo que no
 *    respondieron.
 * 3. "Reconfirmá" 2 h antes a los que siguen en "tal vez".
 * Todo con control de duplicados: cada aviso sale una sola vez.
 */
export async function POST(request: Request) {
  if (!process.env.TAREAS_CLAVE) {
    return NextResponse.json({ error: 'Falta TAREAS_CLAVE en el ambiente.' }, { status: 503 });
  }
  if (request.headers.get('x-tarea-clave') !== process.env.TAREAS_CLAVE) {
    return NextResponse.json({ error: 'Clave incorrecta.' }, { status: 401 });
  }

  const ahora = new Date();
  const en2h = new Date(ahora.getTime() + 2 * 3600 * 1000);
  const en24h = new Date(ahora.getTime() + 24 * 3600 * 1000);

  // Limpieza: registros con Google que quedaron a medio camino.
  await prisma.tokenGoogle.deleteMany({ where: { expiraEn: { lt: ahora } } });
  const resumen = { invitacionesVencidas: 0, recordatorios24h: 0, reconfirmaciones: 0 };

  // ---- 1. Invitaciones vencidas ----
  const vencidas = await prisma.participacion.findMany({
    where: { estado: 'ESPERA', invitacionExpiraEn: { lt: ahora } },
    include: { partido: { include: { deporte: true } } },
  });
  for (const p of vencidas) {
    const ultimo = await prisma.participacion.aggregate({
      where: { partidoId: p.partidoId, estado: 'ESPERA' },
      _max: { ordenEspera: true },
    });
    await prisma.participacion.update({
      where: { id: p.id },
      data: { invitacionExpiraEn: null, ordenEspera: (ultimo._max.ordenEspera ?? 0) + 1 },
    });
    await prisma.notificacion.create({
      data: {
        usuarioId: p.usuarioId,
        tipo: 'ESPERA_VENCIDA',
        titulo: 'Se venció tu lugar reservado',
        cuerpo: `Pasaron las 2 horas sin respuesta y el lugar siguió de largo. Quedaste al final de la lista de espera.`,
        url: `/partidos/${p.partidoId}`,
      },
    });
    await enviarPush(p.usuarioId, {
      titulo: 'Se venció tu lugar reservado',
      cuerpo: 'Pasaron las 2 horas sin respuesta. Quedaste al final de la lista de espera.',
      url: `/partidos/${p.partidoId}`,
    });
    await ofrecerLugarLibre(prisma, p.partidoId);
    resumen.invitacionesVencidas++;
  }

  // ---- 2 y 3. Recordatorios ----
  const proximos = await prisma.partido.findMany({
    where: { estado: { in: ['ARMANDOSE', 'CONFIRMADO'] }, fecha: { gte: ahora, lte: en24h } },
    include: {
      deporte: true,
      participaciones: true,
      grupo: { include: { miembros: { select: { usuarioId: true } } } },
    },
  });

  async function avisarUnaVez(
    usuarioId: string,
    tipo: string,
    partidoId: string,
    titulo: string,
    cuerpo: string
  ) {
    const url = `/partidos/${partidoId}`;
    const yaAvisado = await prisma.notificacion.findFirst({ where: { usuarioId, tipo, url } });
    if (yaAvisado) return false;
    await prisma.notificacion.create({ data: { usuarioId, tipo, titulo, cuerpo, url } });
    await enviarPush(usuarioId, { titulo, cuerpo, url });
    return true;
  }

  for (const partido of proximos) {
    const rotulo = `${partido.deporte.nombre} en ${partido.lugarNombre}`;
    const hora = partido.fecha.toLocaleTimeString('es-AR', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Argentina/Buenos_Aires',
    });

    // 24 h antes: a los "tal vez" y a los del grupo que no respondieron.
    const talvez = partido.participaciones.filter((p) => p.estado === 'TALVEZ');
    const respondieron = new Set(partido.participaciones.map((p) => p.usuarioId));
    const sinRespuesta = (partido.grupo?.miembros ?? [])
      .map((m) => m.usuarioId)
      .filter((usuarioId) => !respondieron.has(usuarioId) && usuarioId !== partido.organizadorId);

    for (const usuarioId of [...talvez.map((p) => p.usuarioId), ...sinRespuesta]) {
      const mando = await avisarUnaVez(
        usuarioId,
        'RECORDATORIO',
        partido.id,
        `Mañana: ${rotulo} a las ${hora}`,
        'Todavía no confirmaste. Un toque en Voy o No voy y el organizador respira.'
      );
      if (mando) resumen.recordatorios24h++;
    }

    // 2 h antes: reconfirmación a los que siguen en "tal vez".
    if (partido.fecha <= en2h) {
      for (const p of talvez) {
        const mando = await avisarUnaVez(
          p.usuarioId,
          'RECONFIRMA',
          partido.id,
          `Arranca a las ${hora}: ¿venís o no?`,
          `${rotulo}. Definí ahora así, si no vas, tu lugar lo usa otro.`
        );
        if (mando) resumen.reconfirmaciones++;
      }
    }
  }

  return NextResponse.json(resumen);
}
