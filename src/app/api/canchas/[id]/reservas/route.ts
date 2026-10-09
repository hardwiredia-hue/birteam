import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { usuarioActual } from '@/lib/auth';
import { suscripcionActiva } from '@/lib/suscripcion';
import { permitir } from '@/lib/limite';
import { esquemaReserva, erroresDeZod } from '@/lib/validacion';
import { formatearPlata } from '@/lib/formato';
import {
  ESTADOS_ACTIVOS,
  HORAS_RESPUESTA,
  MINUTOS_ANTICIPACION,
  avisarReserva,
  claveOcupa,
  diaDeSemana,
  diasDeLaCancha,
  horariosDelDia,
  inicioDelTurno,
  liberarVencidas,
  precioDelTurno,
  proximosDias,
  rotuloDia,
  seSuperponen,
} from '@/lib/reservas';

/** Pedidos de turno sin confirmar que puede tener abiertos un jugador en una misma cancha. */
const MAXIMO_PENDIENTES = 3;

/**
 * Pedir un turno. El jugador lo solicita y el dueño confirma; si lo pide el
 * dueño, queda bloqueado directo (reserva telefónica, mantenimiento…).
 * La base impide que dos reservas activas tomen el mismo turno.
 */
export async function POST(request: Request, contexto: { params: Promise<{ id: string }> }) {
  const usuario = await usuarioActual();
  if (!usuario) return NextResponse.json({ error: 'Entrá primero.' }, { status: 401 });

  const { id } = await contexto.params;
  const cancha = await prisma.cancha.findUnique({
    where: { id },
    include: { dueno: { select: { id: true, suscripcionHasta: true } } },
  });
  if (!cancha) return NextResponse.json({ error: 'Esa cancha no existe.' }, { status: 404 });

  const esDueno = cancha.duenoId === usuario.id;
  if (!esDueno) {
    if (!cancha.activa || !suscripcionActiva(cancha.dueno)) {
      return NextResponse.json({ error: 'Esta cancha no está tomando turnos.' }, { status: 409 });
    }
    if (!cancha.reservasOnline) {
      return NextResponse.json(
        { error: 'Esta cancha reserva solo por teléfono.' },
        { status: 409 }
      );
    }
    if (!permitir(`reserva:${usuario.id}`, 10, 10 * 60_000)) {
      return NextResponse.json(
        { error: 'Pediste muchos turnos seguidos. Esperá unos minutos.' },
        { status: 429 }
      );
    }
  }

  const cuerpo = await request.json().catch(() => null);
  const datos = esquemaReserva.safeParse(cuerpo);
  if (!datos.success) {
    return NextResponse.json(
      { error: 'Revisá los datos.', detalles: erroresDeZod(datos.error) },
      { status: 400 }
    );
  }
  const { fecha, hora } = datos.data;
  const nota = datos.data.nota || null;

  // Solo turnos reales de la grilla: día dentro del rango, abierto, horario válido.
  if (!proximosDias().includes(fecha)) {
    return NextResponse.json({ error: 'Ese día no se puede reservar todavía.' }, { status: 400 });
  }
  if (!diasDeLaCancha(cancha.diasDisponibles).includes(diaDeSemana(fecha))) {
    return NextResponse.json({ error: 'La cancha no abre ese día.' }, { status: 400 });
  }
  if (!horariosDelDia(cancha).includes(hora)) {
    return NextResponse.json({ error: 'Ese horario no es un turno de la cancha.' }, { status: 400 });
  }
  const inicio = inicioDelTurno(fecha, hora);
  const minimo = esDueno ? Date.now() : Date.now() + MINUTOS_ANTICIPACION * 60_000;
  if (inicio.getTime() < minimo) {
    return NextResponse.json(
      { error: 'Ese turno ya arrancó o está por arrancar. Llamá al complejo.' },
      { status: 400 }
    );
  }

  await liberarVencidas(cancha.id);

  if (!esDueno) {
    const pendientes = await prisma.reserva.count({
      where: { canchaId: cancha.id, usuarioId: usuario.id, estado: 'SOLICITADA' },
    });
    if (pendientes >= MAXIMO_PENDIENTES) {
      return NextResponse.json(
        { error: `Ya tenés ${MAXIMO_PENDIENTES} pedidos esperando respuesta en esta cancha.` },
        { status: 409 }
      );
    }
  }

  // Superposición con turnos tomados (por si el dueño cambió la duración de los turnos).
  const delDia = await prisma.reserva.findMany({
    where: { canchaId: cancha.id, fecha, estado: { in: ESTADOS_ACTIVOS } },
    select: { inicio: true, duracion: true },
  });
  if (
    delDia.some((otra) =>
      seSuperponen(inicio.getTime(), cancha.duracionTurno, otra.inicio.getTime(), otra.duracion)
    )
  ) {
    return NextResponse.json({ error: 'Ese turno ya está tomado.' }, { status: 409 });
  }

  const precio = precioDelTurno(cancha.precioPorHora, cancha.duracionTurno);
  const venceEn = new Date(
    Math.min(Date.now() + HORAS_RESPUESTA * 3600_000, inicio.getTime())
  );

  let reserva;
  try {
    reserva = await prisma.reserva.create({
      data: {
        canchaId: cancha.id,
        usuarioId: usuario.id,
        fecha,
        hora,
        inicio,
        duracion: cancha.duracionTurno,
        estado: esDueno ? 'BLOQUEO' : 'SOLICITADA',
        precio: esDueno ? null : precio,
        nota,
        ocupa: claveOcupa(cancha.id, fecha, hora),
        venceEn: esDueno ? null : venceEn,
      },
    });
  } catch (error) {
    // Dos pedidos al mismo tiempo: gana el primero, el otro choca con la clave única.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ error: 'Ese turno ya está tomado.' }, { status: 409 });
    }
    throw error;
  }

  if (!esDueno) {
    await avisarReserva(
      cancha.duenoId,
      'RESERVA_SOLICITADA',
      `Pedido de turno · ${cancha.nombre}`,
      `${usuario.nombre} pide el ${rotuloDia(fecha)} a las ${hora}${
        precio != null ? ` (${formatearPlata(precio)})` : ''
      }. Confirmalo antes de ${HORAS_RESPUESTA} h o se libera.`,
      '/reservas'
    );
  }

  return NextResponse.json({ id: reserva.id, estado: reserva.estado }, { status: 201 });
}
