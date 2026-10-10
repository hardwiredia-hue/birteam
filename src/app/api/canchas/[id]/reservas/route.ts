import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { usuarioActual } from '@/lib/auth';
import { suscripcionActiva } from '@/lib/suscripcion';
import { permitir } from '@/lib/limite';
import { esquemaReserva, erroresDeZod } from '@/lib/validacion';
import { formatearPlata } from '@/lib/formato';
import {
  MINUTOS_PARA_PAGAR,
  comisionPorcentaje,
  crearPreferencia,
  duenoCobraOnline,
  montoOnline,
  registrarEvento,
  tokenDelDueno,
  urlPublica,
} from '@/lib/mercadopago';
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
      where: { canchaId: cancha.id, usuarioId: usuario.id, estado: { in: ['SOLICITADA', 'PENDIENTE_PAGO'] } },
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

  // Si el turno está en el Radar, se pide al precio de la oferta.
  const oferta = esDueno
    ? null
    : await prisma.ofertaTurno.findUnique({
        where: { canchaId_fecha_hora: { canchaId: cancha.id, fecha, hora } },
      });
  const precio = oferta
    ? oferta.precioOferta
    : precioDelTurno(cancha.precioPorHora, cancha.duracionTurno);
  // Cobro online: el turno queda retenido unos minutos mientras se paga y se
  // confirma solo cuando Mercado Pago informa el pago aprobado.
  const aCobrar =
    !esDueno && precio != null && cancha.cobroOnline !== 'NO' && (await duenoCobraOnline(cancha.duenoId))
      ? montoOnline(precio, cancha.cobroOnline, cancha.senaPorcentaje)
      : null;
  const venceEn = aCobrar
    ? new Date(Math.min(Date.now() + MINUTOS_PARA_PAGAR * 60_000, inicio.getTime()))
    : new Date(Math.min(Date.now() + HORAS_RESPUESTA * 3600_000, inicio.getTime()));

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
        estado: esDueno ? 'BLOQUEO' : aCobrar ? 'PENDIENTE_PAGO' : 'SOLICITADA',
        precio: esDueno ? null : precio,
        nota,
        ocupa: claveOcupa(cancha.id, fecha, hora),
        venceEn: esDueno ? null : venceEn,
        ofertaId: oferta?.id ?? null,
        ...(aCobrar ? { montoOnline: aCobrar, pagoEstado: 'PENDIENTE' } : {}),
      },
    });
  } catch (error) {
    // Dos pedidos al mismo tiempo: gana el primero, el otro choca con la clave única.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ error: 'Ese turno ya está tomado.' }, { status: 409 });
    }
    throw error;
  }

  if (aCobrar) {
    try {
      const cuenta = await tokenDelDueno(cancha.duenoId);
      if (!cuenta) throw new Error('Cuenta de Mercado Pago del complejo sin conectar.');
      const comision = Math.round((aCobrar * (await comisionPorcentaje())) / 100);
      const preferencia = await crearPreferencia(cuenta, {
        reservaId: reserva.id,
        titulo: `${cancha.nombre} · ${rotuloDia(fecha)} ${hora}${cancha.cobroOnline === 'SENA' ? ' (seña)' : ''}`,
        monto: aCobrar,
        comision,
        venceEn,
        email: usuario.email,
        base: urlPublica(request),
      });
      await prisma.reserva.update({
        where: { id: reserva.id },
        data: { mpPreferenciaId: preferencia.id, mpLinkPago: preferencia.linkPago },
      });
      await registrarEvento(reserva.id, 'LINK_CREADO', `${aCobrar} ARS, comisión ${comision}`);
      return NextResponse.json(
        { id: reserva.id, estado: reserva.estado, pagarUrl: preferencia.linkPago },
        { status: 201 }
      );
    } catch (error) {
      // Sin link de pago no hay reserva: se libera el turno al instante.
      await prisma.reserva.update({
        where: { id: reserva.id },
        data: { estado: 'CANCELADA', ocupa: null, venceEn: null, pagoEstado: null },
      });
      await registrarEvento(reserva.id, 'LINK_FALLIDO', (error as Error).message);
      return NextResponse.json(
        { error: 'No pudimos generar el pago con Mercado Pago. Probá de nuevo en un rato.' },
        { status: 502 }
      );
    }
  }

  if (!esDueno) {
    await avisarReserva(
      cancha.duenoId,
      'RESERVA_SOLICITADA',
      `Pedido de turno · ${cancha.nombre}`,
      `${usuario.nombre} pide el ${rotuloDia(fecha)} a las ${hora}${
        precio != null ? ` (${formatearPlata(precio)}${oferta ? ', precio del Radar' : ''})` : ''
      }. Confirmalo antes de ${HORAS_RESPUESTA} h o se libera.`,
      '/reservas'
    );
  }

  return NextResponse.json({ id: reserva.id, estado: reserva.estado }, { status: 201 });
}
