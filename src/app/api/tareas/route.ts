import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { ofrecerLugarLibre } from '@/lib/espera';
import { enviarPush } from '@/lib/push';
import { posiblesVecinos, vecinosDe } from '@/lib/cercania';
import { completarCoordenadasDePartidos } from '@/lib/coordenadas';
import { avisarReserva, liberarVencidas, rotuloDia } from '@/lib/reservas';
import { repetirSemanales } from '@/lib/repetir';
import { pedirResenas } from '@/lib/resenas';
import { cerrarPartidosSinLista, recordarPagos, recordarPasarLista } from '@/lib/cierre-partidos';
import { resumenDeLaManana } from '@/lib/resumen-complejo';
import { puedeJugar } from '@/lib/disponibilidad';

/**
 * Tareas programadas (las corre el cron del servidor cada 10 minutos, ver
 * deploy/PUBLICAR.md). Protegido con la clave TAREAS_CLAVE del ambiente.
 *
 * 1. Vence invitaciones de la lista de espera (2 h sin contestar → el
 *    lugar pasa al siguiente y el vencido va al final de la cola).
 * 2. Recordatorio 24 h antes a los "tal vez" y a los del grupo que no
 *    respondieron.
 * 3. "Reconfirmá" 2 h antes a los que siguen en "tal vez".
 * Además: arma el partido de la semana siguiente de los que se repiten y
 * pide la reseña de la cancha a quien jugó (una vez por cancha); recuerda
 * pasar lista y, si nadie lo hace, a las 48 h da el partido por jugado.
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
  const resumen = {
    invitacionesVencidas: 0,
    recordatorios24h: 0,
    reconfirmaciones: 0,
    pedidosVencidos: 0,
    recordatoriosTurno: 0,
    avisosFaltanJugadores: 0,
    partidosUbicados: 0,
    partidosRepetidos: 0,
    pedidosDeResena: 0,
    recordatoriosLista: 0,
    partidosCerrados: 0,
    resumenesComplejo: 0,
    recordatoriosPago: 0,
  };

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

  // ---- 4. Turnos de cancha ----
  // Pedidos que el dueño no contestó a tiempo: se liberan.
  resumen.pedidosVencidos = await liberarVencidas();
  // Ofertas del Radar de turnos que ya pasaron: no sirven más.
  await prisma.ofertaTurno.deleteMany({ where: { inicio: { lt: ahora } } });
  // Recordatorio 3 h antes de un turno confirmado (una sola vez).
  const en3h = new Date(ahora.getTime() + 3 * 3600 * 1000);
  const turnosCerca = await prisma.reserva.findMany({
    where: { estado: 'CONFIRMADA', recordadaEn: null, inicio: { gt: ahora, lte: en3h } },
    include: { cancha: { select: { id: true, nombre: true, direccion: true } } },
  });
  for (const reserva of turnosCerca) {
    const { count } = await prisma.reserva.updateMany({
      where: { id: reserva.id, recordadaEn: null },
      data: { recordadaEn: ahora },
    });
    if (count === 0) continue;
    await avisarReserva(
      reserva.usuarioId,
      'RESERVA_RECORDATORIO',
      `Hoy jugás · ${reserva.cancha.nombre}`,
      `Tu turno es ${rotuloDia(reserva.fecha)} a las ${reserva.hora} en ${reserva.cancha.direccion}.`,
      reserva.partidoId ? `/partidos/${reserva.partidoId}` : '/reservas'
    );
    resumen.recordatoriosTurno++;
  }

  // Partidos viejos sin coordenadas: se ubican (cancha o ciudad) antes de
  // avisar, así el aviso por distancia les llega a los que están cerca.
  resumen.partidosUbicados = await completarCoordenadasDePartidos();
  resumen.partidosRepetidos = await repetirSemanales(ahora);
  resumen.pedidosDeResena = await pedirResenas(ahora);
  resumen.recordatoriosLista = await recordarPasarLista(ahora);
  resumen.partidosCerrados = await cerrarPartidosSinLista(ahora);
  resumen.resumenesComplejo = await resumenDeLaManana(ahora);
  resumen.recordatoriosPago = await recordarPagos(ahora);

  // ---- 5. Partidos abiertos a los que les faltan jugadores ----
  // Una sola vez por partido, a quienes juegan ese deporte cerca (dentro del
  // radio de cada uno, o en la misma ciudad), con la preferencia prendida y
  // como mucho un aviso así por día. Los más cercanos primero.
  const en48h = new Date(ahora.getTime() + 48 * 3600 * 1000);
  const hace24h = new Date(ahora.getTime() - 24 * 3600 * 1000);
  const abiertos = await prisma.partido.findMany({
    where: {
      visibilidad: 'ABIERTO',
      estado: { in: ['ARMANDOSE', 'CONFIRMADO'] },
      listaCerrada: false,
      avisoFaltanEn: null,
      fecha: { gt: en2h, lte: en48h },
    },
    include: {
      deporte: { select: { nombre: true } },
      participaciones: { select: { usuarioId: true, estado: true } },
    },
    take: 50,
  });
  for (const partido of abiertos) {
    const voy = partido.participaciones.filter((p) => p.estado === 'VOY').length;
    const faltan = partido.cupo - voy;
    await prisma.partido.update({ where: { id: partido.id }, data: { avisoFaltanEn: ahora } });
    const zona = posiblesVecinos(partido);
    if (faltan <= 0 || !zona) continue;
    const bloqueos = await prisma.bloqueo.findMany({
      where: { OR: [{ bloqueadorId: partido.organizadorId }, { bloqueadoId: partido.organizadorId }] },
      select: { bloqueadorId: true, bloqueadoId: true },
    });
    const excluidos = [
      partido.organizadorId,
      ...partido.participaciones.map((p) => p.usuarioId),
      ...bloqueos.flatMap((b) => [b.bloqueadorId, b.bloqueadoId]),
    ];
    const candidatos = vecinosDe(
      (await prisma.usuario.findMany({
        where: {
          id: { notIn: excluidos },
          eliminadoEn: null,
          avisosPartidos: true,
          deportes: { some: { deporteId: partido.deporteId } },
          notificaciones: { none: { tipo: 'FALTAN_JUGADORES', creadoEn: { gte: hace24h } } },
          ...zona,
        },
        select: { id: true, ciudad: true, latitud: true, longitud: true, radioKm: true, disponibilidad: true },
        take: 300,
      })).filter((c) => puedeJugar(c.disponibilidad, partido.fecha)),
      partido,
      30
    );
    if (candidatos.length === 0) continue;
    const dia = partido.fecha.toLocaleDateString('es-AR', { weekday: 'long', timeZone: 'America/Argentina/Buenos_Aires' });
    const horaPartido = partido.fecha.toLocaleTimeString('es-AR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'America/Argentina/Buenos_Aires',
    });
    const titulo = `Faltan ${faltan} para ${partido.deporte.nombre}`;
    const cuerpo = `El ${dia} a las ${horaPartido} en ${partido.lugarNombre}. ¿Te sumás?`;
    await prisma.notificacion.createMany({
      data: candidatos.map((c) => ({
        usuarioId: c.id,
        tipo: 'FALTAN_JUGADORES',
        titulo,
        cuerpo,
        url: `/partidos/${partido.id}`,
        expiraEn: partido.fecha,
      })),
    });
    await enviarPush(
      candidatos.map((c) => c.id),
      { titulo, cuerpo, url: `/partidos/${partido.id}` }
    );
    resumen.avisosFaltanJugadores += candidatos.length;
  }

  return NextResponse.json(resumen);
}
