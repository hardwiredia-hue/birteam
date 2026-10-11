import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { usuarioActual } from '@/lib/auth';
import { esquemaReserva, erroresDeZod } from '@/lib/validacion';
import { MAXIMO_ALERTAS } from '@/lib/alertas-turno';
import {
  ESTADOS_ACTIVOS,
  MINUTOS_ANTICIPACION,
  diaDeSemana,
  diasDeLaCancha,
  horariosDelDia,
  inicioDelTurno,
  proximosDias,
  seSuperponen,
} from '@/lib/reservas';

/** "Avisame si se libera": anotarse para un turno que hoy está tomado. */
export async function POST(request: Request, contexto: { params: Promise<{ id: string }> }) {
  const usuario = await usuarioActual();
  if (!usuario) return NextResponse.json({ error: 'Entrá primero.' }, { status: 401 });
  const { id } = await contexto.params;
  const cancha = await prisma.cancha.findUnique({ where: { id } });
  if (!cancha || !cancha.activa || !cancha.reservasOnline) {
    return NextResponse.json({ error: 'Esta cancha no está tomando turnos.' }, { status: 409 });
  }

  const datos = esquemaReserva.safeParse(await request.json().catch(() => null));
  if (!datos.success) {
    return NextResponse.json({ error: 'Revisá los datos.', detalles: erroresDeZod(datos.error) }, { status: 400 });
  }
  const { fecha, hora } = datos.data;
  if (
    !proximosDias().includes(fecha) ||
    !diasDeLaCancha(cancha.diasDisponibles).includes(diaDeSemana(fecha)) ||
    !horariosDelDia(cancha).includes(hora)
  ) {
    return NextResponse.json({ error: 'Ese horario no es un turno de la cancha.' }, { status: 400 });
  }
  const inicio = inicioDelTurno(fecha, hora);
  if (inicio.getTime() < Date.now() + MINUTOS_ANTICIPACION * 60_000) {
    return NextResponse.json({ error: 'Ese turno ya está por arrancar.' }, { status: 400 });
  }

  const tomadas = await prisma.reserva.findMany({
    where: { canchaId: cancha.id, fecha, estado: { in: ESTADOS_ACTIVOS } },
    select: { inicio: true, duracion: true, usuarioId: true },
  });
  const tomada = tomadas.find((r) => seSuperponen(inicio.getTime(), cancha.duracionTurno, r.inicio.getTime(), r.duracion));
  if (!tomada) return NextResponse.json({ error: 'Ese turno está libre: pedilo ahora.' }, { status: 409 });
  if (tomada.usuarioId === usuario.id) {
    return NextResponse.json({ error: 'Ese turno ya es tuyo.' }, { status: 409 });
  }

  const pendientes = await prisma.alertaTurno.count({
    where: { usuarioId: usuario.id, avisadoEn: null, fecha: { gte: proximosDias(1)[0] } },
  });
  if (pendientes >= MAXIMO_ALERTAS) {
    return NextResponse.json(
      { error: `Ya esperás ${MAXIMO_ALERTAS} turnos. Sacá alguno para sumar otro.` },
      { status: 409 }
    );
  }

  await prisma.alertaTurno.upsert({
    where: { canchaId_usuarioId_fecha_hora: { canchaId: cancha.id, usuarioId: usuario.id, fecha, hora } },
    create: { canchaId: cancha.id, usuarioId: usuario.id, fecha, hora },
    update: { avisadoEn: null },
  });
  return NextResponse.json({ listo: true }, { status: 201 });
}

/** Dejar de esperar ese turno. */
export async function DELETE(request: Request, contexto: { params: Promise<{ id: string }> }) {
  const usuario = await usuarioActual();
  if (!usuario) return NextResponse.json({ error: 'Entrá primero.' }, { status: 401 });
  const { id } = await contexto.params;
  const datos = esquemaReserva.safeParse(await request.json().catch(() => null));
  if (!datos.success) return NextResponse.json({ error: 'Revisá los datos.' }, { status: 400 });
  await prisma.alertaTurno.deleteMany({
    where: { canchaId: id, usuarioId: usuario.id, fecha: datos.data.fecha, hora: datos.data.hora },
  });
  return NextResponse.json({ listo: true });
}
