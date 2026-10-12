import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { usuarioActual } from '@/lib/auth';
import { suscripcionActiva } from '@/lib/suscripcion';
import { erroresDeZod } from '@/lib/validacion';
import { formatearPlata } from '@/lib/formato';
import { enviarPush } from '@/lib/push';
import { posiblesVecinos, vecinosDe } from '@/lib/cercania';
import {
  ESTADOS_ACTIVOS,
  MINUTOS_ANTICIPACION,
  diaDeSemana,
  diasDeLaCancha,
  horariosDelDia,
  inicioDelTurno,
  porcentajeDescuento,
  precioDelTurnoEn,
  proximosDias,
  rotuloDia,
  seSuperponen,
} from '@/lib/reservas';

const esquemaOferta = z.object({
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida.'),
  hora: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Hora inválida.'),
  precio: z.number({ error: 'Poné el precio de la oferta.' }).min(0).max(10_000_000),
});

/** Avisos del Radar a la misma persona: como mucho uno cada 12 h. */
const HORAS_ENTRE_AVISOS = 12;

/**
 * Publicar un turno libre en el Radar con precio rebajado. Solo el dueño, solo
 * sobre un turno real de la grilla que hoy está libre: nunca disponibilidad
 * inventada.
 */
export async function POST(request: Request, contexto: { params: Promise<{ id: string }> }) {
  const usuario = await usuarioActual();
  if (!usuario) return NextResponse.json({ error: 'Entrá primero.' }, { status: 401 });

  const { id } = await contexto.params;
  const cancha = await prisma.cancha.findUnique({
    where: { id },
    include: { dueno: { select: { suscripcionHasta: true } } },
  });
  if (!cancha) return NextResponse.json({ error: 'Esa cancha no existe.' }, { status: 404 });
  if (cancha.duenoId !== usuario.id) {
    return NextResponse.json({ error: 'Publica ofertas el dueño de la cancha.' }, { status: 403 });
  }
  if (!cancha.activa || !cancha.reservasOnline || !suscripcionActiva(cancha.dueno)) {
    return NextResponse.json(
      { error: 'Para el Radar la cancha tiene que estar publicada y con pedidos online prendidos.' },
      { status: 409 }
    );
  }

  const cuerpo = await request.json().catch(() => null);
  const datos = esquemaOferta.safeParse(cuerpo);
  if (!datos.success) {
    return NextResponse.json(
      { error: 'Revisá los datos.', detalles: erroresDeZod(datos.error) },
      { status: 400 }
    );
  }
  const { fecha, hora, precio } = datos.data;

  if (
    !proximosDias().includes(fecha) ||
    !diasDeLaCancha(cancha.diasDisponibles).includes(diaDeSemana(fecha)) ||
    !horariosDelDia(cancha).includes(hora)
  ) {
    return NextResponse.json({ error: 'Ese turno no está en tu grilla.' }, { status: 400 });
  }
  const inicio = inicioDelTurno(fecha, hora);
  if (inicio.getTime() < Date.now() + MINUTOS_ANTICIPACION * 60_000) {
    return NextResponse.json(
      { error: 'Ese turno arranca muy pronto para que alguien lo pida online.' },
      { status: 400 }
    );
  }
  const precioOriginal = precioDelTurnoEn(cancha, fecha, hora);
  if (precioOriginal != null && precio >= precioOriginal) {
    return NextResponse.json(
      { error: `La oferta tiene que ser menor que el precio normal (${formatearPlata(precioOriginal)}).` },
      { status: 400 }
    );
  }

  const tomadas = await prisma.reserva.findMany({
    where: { canchaId: cancha.id, fecha, estado: { in: ESTADOS_ACTIVOS } },
    select: { inicio: true, duracion: true },
  });
  if (tomadas.some((r) => seSuperponen(inicio.getTime(), cancha.duracionTurno, r.inicio.getTime(), r.duracion))) {
    return NextResponse.json({ error: 'Ese turno ya está tomado.' }, { status: 409 });
  }

  const previa = await prisma.ofertaTurno.findUnique({
    where: { canchaId_fecha_hora: { canchaId: cancha.id, fecha, hora } },
  });
  const oferta = await prisma.ofertaTurno.upsert({
    where: { canchaId_fecha_hora: { canchaId: cancha.id, fecha, hora } },
    create: { canchaId: cancha.id, fecha, hora, inicio, precioOriginal, precioOferta: precio },
    update: { precioOriginal, precioOferta: precio },
  });

  // Aviso a los que juegan ese deporte cerca de la cancha, dentro del radio
  // de cada uno (o en su ciudad). Solo la primera vez. Una cancha sin
  // ciudad ni coordenadas avisa como antes, sin filtro de zona.
  const zona = posiblesVecinos(cancha);
  if (!previa) {
    const descuento = porcentajeDescuento(precioOriginal, precio);
    const desde = new Date(Date.now() - HORAS_ENTRE_AVISOS * 3600_000);
    const candidatos = await prisma.usuario.findMany({
      where: {
        id: { not: usuario.id },
        avisosRadar: true,
        eliminadoEn: null,
        deportes: { some: { deporteId: cancha.deporteId } },
        notificaciones: { none: { tipo: 'RADAR', creadoEn: { gte: desde } } },
        ...(zona ?? {}),
      },
      select: { id: true, ciudad: true, latitud: true, longitud: true, radioKm: true },
      take: 600,
    });
    const interesados = zona ? vecinosDe(candidatos, cancha, 200) : candidatos.slice(0, 200);
    if (interesados.length > 0) {
      const titulo = `Radar · ${cancha.nombre}${descuento ? ` −${descuento}%` : ''}`;
      const cuerpoAviso = `Turno libre ${rotuloDia(fecha)} a las ${hora} a ${formatearPlata(precio)}. Pedilo antes que otro.`;
      await prisma.notificacion.createMany({
        data: interesados.map(({ id: usuarioId }) => ({
          usuarioId,
          tipo: 'RADAR',
          titulo,
          cuerpo: cuerpoAviso,
          url: '/radar',
          expiraEn: inicio,
        })),
      });
      await enviarPush(
        interesados.map((i) => i.id),
        { titulo, cuerpo: cuerpoAviso, url: '/radar' }
      );
    }
  }

  return NextResponse.json({ id: oferta.id }, { status: previa ? 200 : 201 });
}
