import { Prisma } from '@prisma/client';
import { prisma } from './db';
import { formatearPlata } from './formato';
import { avisarReserva, claveOcupa, rotuloDia } from './reservas';
import { type CuentaActiva, obtenerPago, reembolsar, registrarEvento, tokenDelDueno } from './mercadopago';

/**
 * Procesa un pago informado por Mercado Pago (webhook o vuelta del checkout).
 * Siempre se consulta el pago a la API con el token del dueño: lo que diga
 * el navegador o el aviso no alcanza. Idempotente: el mismo pago procesado
 * dos veces no confirma ni devuelve dos veces.
 */
export async function procesarPago(reservaId: string, pagoId: string) {
  const reserva = await prisma.reserva.findUnique({
    where: { id: reservaId },
    include: { cancha: { select: { id: true, nombre: true, duenoId: true } } },
  });
  if (!reserva) return { resultado: 'SIN_RESERVA' as const };

  const cuenta = await tokenDelDueno(reserva.cancha.duenoId);
  if (!cuenta) {
    await registrarEvento(reserva.id, 'SIN_TOKEN', `pago ${pagoId}`);
    return { resultado: 'SIN_TOKEN' as const };
  }

  const pago = await obtenerPago(cuenta, pagoId);
  if (pago.referencia !== reserva.id) {
    await registrarEvento(reserva.id, 'REFERENCIA_AJENA', `pago ${pago.id} trae ${pago.referencia}`);
    return { resultado: 'AJENO' as const };
  }

  const yaRegistrado = await prisma.pagoMercadoPago.findUnique({ where: { mpPaymentId: pago.id } });
  if (yaRegistrado && yaRegistrado.reservaId !== reserva.id) {
    await registrarEvento(reserva.id, 'PAGO_DE_OTRA_RESERVA', `pago ${pago.id} ya es de ${yaRegistrado.reservaId}`);
    return { resultado: 'AJENO' as const };
  }

  await prisma.pagoMercadoPago.upsert({
    where: { mpPaymentId: pago.id },
    create: {
      reservaId: reserva.id,
      mpPaymentId: pago.id,
      estado: pago.estado,
      estadoDetalle: pago.estadoDetalle,
      monto: pago.monto,
      moneda: pago.moneda,
      comision: pago.comision,
    },
    update: { estado: pago.estado, estadoDetalle: pago.estadoDetalle, comision: pago.comision },
  });

  if (pago.estado !== 'approved') {
    await registrarEvento(reserva.id, `PAGO_${pago.estado.toUpperCase()}`, pago.estadoDetalle ?? undefined);
    return { resultado: 'NO_APROBADO' as const, estado: pago.estado };
  }

  const esperado = reserva.montoOnline ?? 0;
  if (pago.moneda !== 'ARS' || pago.monto + 0.5 < esperado) {
    await registrarEvento(reserva.id, 'MONTO_INCORRECTO', `${pago.moneda} ${pago.monto} vs ${esperado}`);
    await devolverPago(reserva.id, cuenta, pago.id, 'el monto no coincidía con el del turno');
    return { resultado: 'MONTO_INCORRECTO' as const };
  }

  return confirmarPagada(reserva.id, cuenta, pago.id);
}

/** El pago está aprobado: la reserva pasa a confirmada (o se devuelve si ya no se puede). */
async function confirmarPagada(reservaId: string, cuenta: CuentaActiva, pagoId: string) {
  const reserva = await prisma.reserva.findUniqueOrThrow({
    where: { id: reservaId },
    include: { cancha: { select: { id: true, nombre: true, duenoId: true } }, usuario: { select: { nombre: true } } },
  });

  if (reserva.estado === 'CONFIRMADA' && reserva.pagoEstado === 'APROBADO') {
    return { resultado: 'YA_CONFIRMADA' as const };
  }

  // Lo canceló el jugador antes de que llegara el pago: se devuelve.
  if (reserva.estado === 'CANCELADA') {
    await devolverPago(reserva.id, cuenta, pagoId, 'el turno ya estaba cancelado');
    return { resultado: 'DEVUELTO' as const };
  }

  let confirmada = false;
  if (reserva.estado === 'PENDIENTE_PAGO') {
    const { count } = await prisma.reserva.updateMany({
      where: { id: reserva.id, estado: 'PENDIENTE_PAGO' },
      data: { estado: 'CONFIRMADA', pagoEstado: 'APROBADO', venceEn: null },
    });
    confirmada = count > 0;
  } else if (reserva.estado === 'VENCIDA' && reserva.inicio.getTime() > Date.now()) {
    // El pago llegó tarde: si el turno sigue libre, se toma de nuevo.
    try {
      await prisma.reserva.update({
        where: { id: reserva.id },
        data: {
          estado: 'CONFIRMADA',
          pagoEstado: 'APROBADO',
          venceEn: null,
          ocupa: claveOcupa(reserva.canchaId, reserva.fecha, reserva.hora),
        },
      });
      confirmada = true;
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')) throw error;
    }
  }

  if (!confirmada) {
    await devolverPago(reserva.id, cuenta, pagoId, 'el turno ya no estaba disponible');
    return { resultado: 'DEVUELTO' as const };
  }

  await registrarEvento(reserva.id, 'CONFIRMADA_POR_PAGO', `pago ${pagoId}`);
  const turno = `${rotuloDia(reserva.fecha)} a las ${reserva.hora}`;
  const pagado = reserva.montoOnline ? formatearPlata(reserva.montoOnline) : '';
  await avisarReserva(
    reserva.usuarioId,
    'RESERVA_CONFIRMADA',
    `Turno pagado y confirmado · ${reserva.cancha.nombre}`,
    `Te esperan el ${turno}. Pagaste ${pagado}${
      reserva.precio && reserva.montoOnline && reserva.precio > reserva.montoOnline
        ? `; el resto (${formatearPlata(reserva.precio - reserva.montoOnline)}) se paga en el complejo`
        : ''
    }.`,
    '/reservas'
  );
  await avisarReserva(
    reserva.cancha.duenoId,
    'RESERVA_PAGADA',
    `Turno vendido · ${reserva.cancha.nombre}`,
    `${reserva.usuario.nombre} pagó ${pagado} por el ${turno}. Ya está confirmado.`,
    '/reservas'
  );
  return { resultado: 'CONFIRMADA' as const };
}

/** Devuelve un pago aprobado y deja constancia; avisa al jugador. */
async function devolverPago(reservaId: string, cuenta: CuentaActiva, pagoId: string, motivo: string) {
  const registro = await prisma.pagoMercadoPago.findUnique({ where: { mpPaymentId: pagoId } });
  if (registro?.reembolsadoEn) return;
  try {
    await reembolsar(cuenta, pagoId);
  } catch (error) {
    await registrarEvento(reservaId, 'REEMBOLSO_FALLIDO', `${pagoId}: ${(error as Error).message}`);
    throw error;
  }
  await prisma.pagoMercadoPago.updateMany({
    where: { mpPaymentId: pagoId },
    data: { estado: 'refunded', reembolsadoEn: new Date() },
  });
  // Si el turno sigue retenido esperando un pago correcto, no se marca como devuelto.
  await prisma.reserva.updateMany({
    where: { id: reservaId, estado: { not: 'PENDIENTE_PAGO' } },
    data: { pagoEstado: 'REEMBOLSADO' },
  });
  await registrarEvento(reservaId, 'REEMBOLSADO', `${pagoId}: ${motivo}`);
  const reserva = await prisma.reserva.findUnique({
    where: { id: reservaId },
    include: { cancha: { select: { id: true, nombre: true } } },
  });
  if (reserva) {
    await avisarReserva(
      reserva.usuarioId,
      'RESERVA_REEMBOLSO',
      `Te devolvimos el pago · ${reserva.cancha.nombre}`,
      `Mercado Pago te reintegra lo pagado por el ${rotuloDia(reserva.fecha)} a las ${reserva.hora}: ${motivo}.`,
      '/reservas'
    );
  }
}

/**
 * Antes de cancelar una reserva pagada: devuelve todos sus pagos aprobados.
 * Si Mercado Pago no acepta la devolución, tira error y la reserva no se
 * cancela (así nunca queda un turno cancelado con la plata cobrada).
 */
export async function reembolsarReserva(reservaId: string, motivo: string) {
  const reserva = await prisma.reserva.findUnique({
    where: { id: reservaId },
    include: { cancha: { select: { duenoId: true } }, pagos: true },
  });
  if (!reserva) return;
  const aprobados = reserva.pagos.filter((pago) => pago.estado === 'approved' && !pago.reembolsadoEn);
  if (aprobados.length === 0) return;
  const cuenta = await tokenDelDueno(reserva.cancha.duenoId);
  if (!cuenta) throw new Error('La cuenta de Mercado Pago del complejo no está conectada.');
  for (const pago of aprobados) {
    await devolverPago(reserva.id, cuenta, pago.mpPaymentId, motivo);
  }
}
