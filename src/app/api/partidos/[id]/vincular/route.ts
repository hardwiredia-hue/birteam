import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { usuarioActual } from '@/lib/auth';
import { enviarPush } from '@/lib/push';
import { claveDia } from '@/lib/reservas';

/**
 * El partido ya tiene cancha: se le vincula un turno confirmado del
 * organizador (misma fecha y deporte). El partido toma lugar y horario del
 * turno y se avisa a los anotados.
 */
export async function POST(request: Request, contexto: { params: Promise<{ id: string }> }) {
  const usuario = await usuarioActual();
  if (!usuario) return NextResponse.json({ error: 'Entrá primero.' }, { status: 401 });
  const { id } = await contexto.params;
  const cuerpo = await request.json().catch(() => ({}));

  const partido = await prisma.partido.findUnique({
    where: { id },
    include: { participaciones: { select: { usuarioId: true, estado: true } } },
  });
  if (!partido) return NextResponse.json({ error: 'Ese partido no existe.' }, { status: 404 });
  if (partido.organizadorId !== usuario.id && partido.coOrganizadorId !== usuario.id) {
    return NextResponse.json({ error: 'Vincula quien organiza.' }, { status: 403 });
  }
  if (partido.estado === 'CANCELADO' || partido.estado === 'JUGADO') {
    return NextResponse.json({ error: 'El partido ya está cerrado.' }, { status: 409 });
  }

  const reserva = await prisma.reserva.findUnique({
    where: { id: String(cuerpo?.reservaId ?? '') },
    include: { cancha: true },
  });
  if (
    !reserva ||
    reserva.usuarioId !== usuario.id ||
    reserva.estado !== 'CONFIRMADA' ||
    reserva.partidoId ||
    reserva.cancha.deporteId !== partido.deporteId ||
    reserva.fecha !== claveDia(partido.fecha)
  ) {
    return NextResponse.json({ error: 'Ese turno no se puede vincular a este partido.' }, { status: 400 });
  }

  await prisma.$transaction([
    prisma.partido.update({
      where: { id: partido.id },
      data: {
        canchaId: reserva.canchaId,
        lugarNombre: reserva.cancha.nombre,
        direccion: reserva.cancha.direccion,
        lugarTelefono: reserva.cancha.telefono,
        ciudad: reserva.cancha.ciudad ?? partido.ciudad,
        fecha: reserva.inicio,
      },
    }),
    prisma.reserva.update({ where: { id: reserva.id }, data: { partidoId: partido.id } }),
  ]);

  const avisados = partido.participaciones
    .filter((p) => ['VOY', 'TALVEZ', 'ESPERA'].includes(p.estado) && p.usuarioId !== usuario.id)
    .map((p) => p.usuarioId);
  if (avisados.length > 0) {
    const titulo = `Ya hay cancha: ${reserva.cancha.nombre}`;
    const cuerpoAviso = `El partido es a las ${reserva.hora} en ${reserva.cancha.direccion}.`;
    await prisma.notificacion.createMany({
      data: avisados.map((usuarioId) => ({
        usuarioId,
        tipo: 'PARTIDO_CAMBIO',
        titulo,
        cuerpo: cuerpoAviso,
        url: `/partidos/${partido.id}`,
      })),
    });
    await enviarPush(avisados, { titulo, cuerpo: cuerpoAviso, url: `/partidos/${partido.id}` });
  }
  return NextResponse.json({ listo: true });
}
