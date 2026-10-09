import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { reembolsarReserva } from '@/lib/cobros';
import { usuarioActual } from '@/lib/auth';
import { esquemaAccionReserva, erroresDeZod } from '@/lib/validacion';
import { HORAS_CANCELACION, avisarReserva, liberarVencidas, rotuloDia } from '@/lib/reservas';

/**
 * Responder un pedido de turno o cancelarlo.
 * - confirmar / rechazar: el dueño, sobre una solicitud.
 * - cancelar: el jugador (solicitud en cualquier momento; confirmada hasta
 *   HORAS_CANCELACION antes) o el dueño (cualquier turno tomado, avisando).
 * Cada cambio se hace con un update condicionado al estado anterior, así dos
 * clics cruzados no pisan una respuesta.
 */
export async function PATCH(request: Request, contexto: { params: Promise<{ id: string }> }) {
  const usuario = await usuarioActual();
  if (!usuario) return NextResponse.json({ error: 'Entrá primero.' }, { status: 401 });

  const cuerpo = await request.json().catch(() => null);
  const datos = esquemaAccionReserva.safeParse(cuerpo);
  if (!datos.success) {
    return NextResponse.json(
      { error: 'Revisá los datos.', detalles: erroresDeZod(datos.error) },
      { status: 400 }
    );
  }
  const { accion } = datos.data;
  const motivo = datos.data.motivo || null;

  const { id } = await contexto.params;
  const encontrada = await prisma.reserva.findUnique({ where: { id }, select: { canchaId: true } });
  if (!encontrada) return NextResponse.json({ error: 'Esa reserva no existe.' }, { status: 404 });
  await liberarVencidas(encontrada.canchaId);

  const reserva = await prisma.reserva.findUnique({
    where: { id },
    include: {
      cancha: { select: { id: true, nombre: true, duenoId: true } },
      usuario: { select: { nombre: true } },
    },
  });
  if (!reserva) return NextResponse.json({ error: 'Esa reserva no existe.' }, { status: 404 });

  const esDueno = reserva.cancha.duenoId === usuario.id;
  const esJugador = reserva.usuarioId === usuario.id;
  const turno = `${rotuloDia(reserva.fecha)} a las ${reserva.hora}`;
  const cambiar = (desde: string[], cambios: { estado: string; ocupa?: null; motivo?: string | null }) =>
    prisma.reserva.updateMany({
      where: { id: reserva.id, estado: { in: desde } },
      data: { ...cambios, venceEn: null },
    });
  const yaCambio = NextResponse.json(
    { error: 'La reserva ya cambió de estado. Actualizá la página.' },
    { status: 409 }
  );

  if (accion === 'confirmar' || accion === 'rechazar') {
    if (!esDueno) {
      return NextResponse.json({ error: 'Responde el dueño de la cancha.' }, { status: 403 });
    }
    if (accion === 'confirmar') {
      const { count } = await cambiar(['SOLICITADA'], { estado: 'CONFIRMADA' });
      if (count === 0) return yaCambio;
      await avisarReserva(
        reserva.usuarioId,
        'RESERVA_CONFIRMADA',
        `Turno confirmado · ${reserva.cancha.nombre}`,
        `Te esperan el ${turno}. Se paga en el complejo. ¿Armás el partido?`,
        '/reservas'
      );
    } else {
      const { count } = await cambiar(['SOLICITADA'], { estado: 'RECHAZADA', ocupa: null, motivo });
      if (count === 0) return yaCambio;
      await avisarReserva(
        reserva.usuarioId,
        'RESERVA_RECHAZADA',
        `No hay turno · ${reserva.cancha.nombre}`,
        `No pudieron darte el ${turno}.${motivo ? ` Motivo: ${motivo.replace(/\.?$/, '.')}` : ''} Probá otro horario.`,
        `/canchas/${reserva.cancha.id}`
      );
    }
    return NextResponse.json({ listo: true });
  }

  // Cancelar.
  if (esDueno) {
    if (reserva.estado === 'BLOQUEO') {
      // Liberar un bloqueo propio: no hay a quién avisar.
      const { count } = await cambiar(['BLOQUEO'], { estado: 'CANCELADA', ocupa: null });
      if (count === 0) return yaCambio;
      return NextResponse.json({ listo: true });
    }
    // Si estaba pagado, primero se devuelve: nunca un turno cancelado con la plata cobrada.
    const devolucion = await devolverSiPago(reserva.id, 'el complejo canceló el turno');
    if (devolucion) return devolucion;
    const { count } = await cambiar(['SOLICITADA', 'PENDIENTE_PAGO', 'CONFIRMADA'], {
      estado: 'CANCELADA',
      ocupa: null,
      motivo,
    });
    if (count === 0) return yaCambio;
    await avisarReserva(
      reserva.usuarioId,
      'RESERVA_CANCELADA',
      `Turno cancelado · ${reserva.cancha.nombre}`,
      `El complejo canceló tu turno del ${turno}.${motivo ? ` Motivo: ${motivo.replace(/\.?$/, '.')}` : ''}${
        reserva.pagoEstado === 'APROBADO' ? ' Te devolvemos todo lo pagado por Mercado Pago.' : ''
      }`,
      `/canchas/${reserva.cancha.id}`
    );
    return NextResponse.json({ listo: true });
  }

  if (!esJugador) {
    return NextResponse.json({ error: 'Esa reserva no es tuya.' }, { status: 403 });
  }
  if (
    reserva.estado === 'CONFIRMADA' &&
    reserva.inicio.getTime() - Date.now() < HORAS_CANCELACION * 3600_000
  ) {
    return NextResponse.json(
      {
        error: `Faltan menos de ${HORAS_CANCELACION} horas: para cancelar, hablá con el complejo.`,
      },
      { status: 409 }
    );
  }
  const devolucion = await devolverSiPago(reserva.id, 'cancelaste con tiempo');
  if (devolucion) return devolucion;
  const { count } = await cambiar(['SOLICITADA', 'PENDIENTE_PAGO', 'CONFIRMADA'], {
    estado: 'CANCELADA',
    ocupa: null,
    motivo,
  });
  if (count === 0) return yaCambio;
  if (reserva.estado === 'PENDIENTE_PAGO') return NextResponse.json({ listo: true });
  await avisarReserva(
    reserva.cancha.duenoId,
    'RESERVA_CANCELADA',
    `Se liberó un turno · ${reserva.cancha.nombre}`,
    `${reserva.usuario.nombre} canceló el ${turno}.${motivo ? ` Motivo: ${motivo.replace(/\.?$/, '.')}` : ''}`,
    '/reservas'
  );
  return NextResponse.json({ listo: true });
}

/** Devuelve lo pagado antes de cancelar; si Mercado Pago falla, corta con error. */
async function devolverSiPago(reservaId: string, motivo: string) {
  try {
    await reembolsarReserva(reservaId, motivo);
    return null;
  } catch {
    return NextResponse.json(
      { error: 'No pudimos devolver el pago por Mercado Pago, así que el turno sigue en pie. Probá de nuevo en un rato.' },
      { status: 502 }
    );
  }
}
