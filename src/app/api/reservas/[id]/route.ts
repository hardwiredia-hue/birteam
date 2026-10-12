import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { reembolsarReserva } from '@/lib/cobros';
import { usuarioActual } from '@/lib/auth';
import { esquemaAccionReserva, erroresDeZod } from '@/lib/validacion';
import { DIAS_PARA_MARCAR_FALTA, avisarAlComplejo, avisarReserva, liberarVencidas, rotuloDia } from '@/lib/reservas';
import { equipoDelComplejo, gestionaCancha } from '@/lib/gestion';
import { avisarTurnoLibre } from '@/lib/alertas-turno';

/**
 * Responder un pedido de turno o cancelarlo.
 * - confirmar / rechazar: el dueño, sobre una solicitud.
 * - cancelar: el jugador (solicitud en cualquier momento; confirmada hasta
 *   las horas de cancelación de la cancha antes) o el dueño (cualquier turno tomado, avisando).
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
      cancha: { select: { id: true, nombre: true, duenoId: true, horasCancelacion: true } },
      usuario: { select: { nombre: true } },
    },
  });
  if (!reserva) return NextResponse.json({ error: 'Esa reserva no existe.' }, { status: 404 });

  // Dueño o empleado del complejo.
  const esDueno = await gestionaCancha(usuario.id, reserva.cancha);
  const esJugador = reserva.usuarioId === usuario.id;
  const turno = `${rotuloDia(reserva.fecha)} a las ${reserva.hora}`;
  // Semana de un turno fijo: se cancela solo ese día, el fijo sigue.
  const deFijo = reserva.turnoFijoId != null;
  // Quedó libre: avisar a quienes lo esperaban ("avisame si se libera").
  const avisarLibre = () => avisarTurnoLibre(reserva.canchaId, reserva.fecha, reserva.hora);
  const cambiar = (desde: string[], cambios: { estado: string; ocupa?: null; motivo?: string | null }) =>
    prisma.reserva.updateMany({
      where: { id: reserva.id, estado: { in: desde } },
      data: { ...cambios, venceEn: null },
    });
  const yaCambio = NextResponse.json(
    { error: 'La reserva ya cambió de estado. Actualizá la página.' },
    { status: 409 }
  );

  // Después del turno: el complejo marca que el jugador no fue (o lo corrige).
  if (accion === 'no_vino' || accion === 'vino') {
    if (!esDueno) return NextResponse.json({ error: 'Lo marca el complejo.' }, { status: 403 });
    const pasado = reserva.inicio.getTime() < Date.now();
    const reciente = Date.now() - reserva.inicio.getTime() < DIAS_PARA_MARCAR_FALTA * 86400_000;
    if (reserva.estado !== 'CONFIRMADA' || !pasado || !reciente) {
      return NextResponse.json(
        { error: `Se marca en turnos confirmados que ya pasaron (hasta ${DIAS_PARA_MARCAR_FALTA} días).` },
        { status: 409 }
      );
    }
    if ((await equipoDelComplejo(reserva.cancha.duenoId)).includes(reserva.usuarioId)) {
      return NextResponse.json({ error: 'Es un turno del propio complejo.' }, { status: 409 });
    }
    const noVino = accion === 'no_vino';
    // Condicionado: con doble clic o dos pestañas, cambia (y avisa) una sola vez.
    const { count } = await prisma.reserva.updateMany({
      where: { id: reserva.id, noVino: !noVino },
      data: { noVino },
    });
    if (count === 0) return NextResponse.json({ listo: true });
    const aviso = {
      usuarioId: reserva.usuarioId,
      tipo: 'RESERVA_NO_VINO',
      titulo: `Faltaste a un turno · ${reserva.cancha.nombre}`,
      cuerpo: `El complejo marcó que no fuiste el ${turno}. Si fue un error, hablá con ellos para que lo corrijan.`,
    };
    if (noVino) {
      await avisarReserva(aviso.usuarioId, 'RESERVA_NO_VINO', aviso.titulo, aviso.cuerpo, `/canchas/${reserva.cancha.id}`);
    } else {
      // Lo corrigieron: el aviso de "faltaste" ya no corre.
      await prisma.notificacion.deleteMany({ where: aviso });
    }
    return NextResponse.json({ listo: true });
  }

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
      await avisarLibre();
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
      await avisarLibre();
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
    await avisarLibre();
    await avisarReserva(
      reserva.usuarioId,
      'RESERVA_CANCELADA',
      deFijo ? `Esta semana no hay turno fijo · ${reserva.cancha.nombre}` : `Turno cancelado · ${reserva.cancha.nombre}`,
      `El complejo canceló tu turno del ${turno}${deFijo ? ' (las otras semanas siguen igual)' : ''}.${motivo ? ` Motivo: ${motivo.replace(/\.?$/, '.')}` : ''}${
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
    reserva.inicio.getTime() - Date.now() < reserva.cancha.horasCancelacion * 3600_000
  ) {
    return NextResponse.json(
      {
        error: `Faltan menos de ${reserva.cancha.horasCancelacion} horas: para cancelar, hablá con el complejo.`,
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
  await avisarLibre();
  if (reserva.estado === 'PENDIENTE_PAGO') return NextResponse.json({ listo: true });
  await avisarAlComplejo(
    reserva.cancha.duenoId,
    'RESERVA_CANCELADA',
    `Se liberó un turno · ${reserva.cancha.nombre}`,
    `${reserva.usuario.nombre} ${deFijo ? 'avisó que no va a su turno fijo del' : 'canceló el'} ${turno}.${motivo ? ` Motivo: ${motivo.replace(/\.?$/, '.')}` : ''}`,
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
