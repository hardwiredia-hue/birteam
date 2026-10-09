import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { usuarioActual } from '@/lib/auth';
import { registrarEvento } from '@/lib/mercadopago';

/** Desconectar Mercado Pago: las canchas dejan de cobrar online (los turnos ya pagados siguen). */
export async function POST() {
  const usuario = await usuarioActual();
  if (!usuario) return NextResponse.json({ error: 'Entrá primero.' }, { status: 401 });
  const pendientes = await prisma.reserva.count({
    where: { cancha: { duenoId: usuario.id }, estado: 'PENDIENTE_PAGO' },
  });
  if (pendientes > 0) {
    return NextResponse.json(
      { error: 'Hay jugadores pagando un turno en este momento. Probá en 15 minutos.' },
      { status: 409 }
    );
  }
  const pagadas = await prisma.reserva.count({
    where: {
      cancha: { duenoId: usuario.id },
      estado: 'CONFIRMADA',
      pagoEstado: 'APROBADO',
      inicio: { gt: new Date() },
    },
  });
  if (pagadas > 0) {
    return NextResponse.json(
      {
        error: `Tenés ${pagadas} ${pagadas === 1 ? 'turno pagado' : 'turnos pagados'} por delante: la cuenta tiene que seguir conectada para poder devolver si se cancelan.`,
      },
      { status: 409 }
    );
  }
  await prisma.cuentaMercadoPago.deleteMany({ where: { usuarioId: usuario.id } });
  await registrarEvento(null, 'CUENTA_DESCONECTADA', usuario.id);
  return NextResponse.json({ listo: true });
}
