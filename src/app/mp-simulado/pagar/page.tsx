import { notFound, redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { usuarioActual } from '@/lib/auth';
import { formatearPlata } from '@/lib/formato';
import { rotuloDia } from '@/lib/reservas';
import { BotonesPagoSimulado } from './botones';

export const metadata = { title: 'Simulador · pagar turno' };
export const dynamic = 'force-dynamic';

/** Hace de checkout de Mercado Pago en el simulador: aprobar o rechazar el pago. */
export default async function PagarSimulado({
  searchParams,
}: {
  searchParams: Promise<{ reserva?: string }>;
}) {
  const { reserva: reservaId } = await searchParams;
  const usuario = await usuarioActual();
  if (!usuario) redirect('/entrar');
  if (!reservaId) notFound();
  const reserva = await prisma.reserva.findUnique({
    where: { id: reservaId },
    include: { cancha: { select: { nombre: true } } },
  });
  if (!reserva || reserva.usuarioId !== usuario.id || reserva.montoOnline == null) notFound();

  return (
    <div className="flex flex-col gap-4 rounded-[10px] bg-white p-6 shadow-sm">
      <p className="text-sm" style={{ color: '#555' }}>
        {reserva.cancha.nombre} · {rotuloDia(reserva.fecha)} {reserva.hora}
      </p>
      <p className="text-3xl font-bold">{formatearPlata(reserva.montoOnline)}</p>
      {reserva.estado === 'PENDIENTE_PAGO' ? (
        <>
          <p className="text-sm" style={{ color: '#555' }}>
            Elegí cómo termina el pago para probar cada caso. En el Mercado Pago real acá pagarías
            con tarjeta, dinero en cuenta, etc.
          </p>
          <BotonesPagoSimulado reservaId={reserva.id} />
        </>
      ) : (
        <p className="text-sm" style={{ color: '#555' }}>
          Esta reserva ya no está esperando pago.{' '}
          <a href={`/reservas/pago?reserva=${reserva.id}`} className="font-bold" style={{ color: '#009ee3' }}>
            Volver a birteam
          </a>
        </p>
      )}
    </div>
  );
}
