import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { usuarioActual } from '@/lib/auth';
import { procesarPago } from '@/lib/cobros';
import { comisionPorcentaje, crearPagoSimulado, pagosSimulados, registrarEvento, tokenDelDueno } from '@/lib/mercadopago';

/**
 * Simulador: registra el pago (aprobado o rechazado) y lo procesa por el
 * mismo camino que un aviso de Mercado Pago. Solo con el simulador prendido
 * y solo sobre reservas propias de canchas con cuenta simulada.
 */
export async function POST(request: Request) {
  if (!(await pagosSimulados())) return NextResponse.json({ error: 'Simulador apagado.' }, { status: 404 });
  const usuario = await usuarioActual();
  if (!usuario) return NextResponse.json({ error: 'Entrá primero.' }, { status: 401 });

  const cuerpo = await request.json().catch(() => ({}));
  const reserva = await prisma.reserva.findUnique({
    where: { id: String(cuerpo?.reservaId ?? '') },
    include: { cancha: { select: { duenoId: true } } },
  });
  if (!reserva || reserva.usuarioId !== usuario.id || reserva.montoOnline == null) {
    return NextResponse.json({ error: 'Esa reserva no es tuya.' }, { status: 404 });
  }
  const cuenta = await tokenDelDueno(reserva.cancha.duenoId);
  if (!cuenta?.simulada) {
    return NextResponse.json({ error: 'La cuenta del complejo no es del simulador.' }, { status: 409 });
  }

  const aprobado = cuerpo?.resultado === 'aprobado';
  const comision = Math.round((reserva.montoOnline * (await comisionPorcentaje())) / 100);
  const pagoId = await crearPagoSimulado(reserva.id, reserva.montoOnline, comision, aprobado);
  await registrarEvento(reserva.id, 'PAGO_SIMULADO', `${pagoId} ${aprobado ? 'aprobado' : 'rechazado'}`);
  await procesarPago(reserva.id, pagoId);
  return NextResponse.json({ vuelta: `/reservas/pago?reserva=${reserva.id}&payment_id=${pagoId}` });
}
