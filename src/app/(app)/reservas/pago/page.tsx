import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { usuarioActual } from '@/lib/auth';
import { formatearPlata } from '@/lib/formato';
import { procesarPago } from '@/lib/cobros';
import { rotuloDia } from '@/lib/reservas';
import { EsperarConfirmacion } from './esperar';

export const metadata = { title: 'Pago del turno' };
export const dynamic = 'force-dynamic';

/**
 * Vuelta desde Mercado Pago. Los parámetros de la URL solo dicen qué pago
 * mirar: el estado real se consulta a la API de Mercado Pago (igual que en
 * el webhook), así que no se puede "confirmar" un turno tocando la URL.
 */
export default async function PagoDelTurno({
  searchParams,
}: {
  searchParams: Promise<{ reserva?: string; payment_id?: string; collection_id?: string }>;
}) {
  const { reserva: reservaId, payment_id, collection_id } = await searchParams;
  const usuario = (await usuarioActual())!;
  if (!reservaId) notFound();

  let reserva = await prisma.reserva.findUnique({
    where: { id: reservaId },
    include: { cancha: { select: { id: true, nombre: true, direccion: true } } },
  });
  if (!reserva || reserva.usuarioId !== usuario.id) notFound();

  const pagoId = payment_id ?? collection_id;
  if (pagoId && /^\d+$/.test(pagoId) && ['PENDIENTE_PAGO', 'VENCIDA'].includes(reserva.estado)) {
    await procesarPago(reserva.id, pagoId).catch(() => null);
    reserva = (await prisma.reserva.findUnique({
      where: { id: reservaId },
      include: { cancha: { select: { id: true, nombre: true, direccion: true } } },
    }))!;
  }

  const rechazado =
    pagoId && reserva.estado === 'PENDIENTE_PAGO'
      ? (await prisma.pagoMercadoPago.findUnique({ where: { mpPaymentId: pagoId } }))?.estado === 'rejected'
      : false;
  const turno = `${rotuloDia(reserva.fecha)} · ${reserva.hora}`;
  const resto =
    reserva.precio != null && reserva.montoOnline != null && reserva.precio > reserva.montoOnline
      ? reserva.precio - reserva.montoOnline
      : 0;

  return (
    <div className="flex flex-col gap-5">
      <header>
        <p className="t-rotulo text-verde-txt">{reserva.cancha.nombre}</p>
        <h1 className="t-display mt-1 text-[26px]">{turno}</h1>
        <p className="mt-1 text-sm text-tinta-2">{reserva.cancha.direccion}</p>
      </header>

      {reserva.estado === 'CONFIRMADA' && reserva.pagoEstado === 'APROBADO' ? (
        <div className="tarjeta flex flex-col gap-3 p-5" style={{ borderColor: 'var(--verde-txt)' }}>
          <p className="t-display text-[22px] text-verde-txt">¡Turno confirmado!</p>
          <p className="text-sm text-tinta-2">
            Pagaste {reserva.montoOnline != null ? formatearPlata(reserva.montoOnline) : ''} con Mercado Pago.
            {resto > 0 ? ` El resto, ${formatearPlata(resto)}, se paga en el complejo.` : ''}
          </p>
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/crear?cancha=${reserva.canchaId}&reserva=${reserva.id}`}
              className="btn btn-primario btn-sm"
            >
              Armar el partido
            </Link>
            <Link href="/reservas" className="btn btn-secundario btn-sm">
              Ver mis reservas
            </Link>
          </div>
        </div>
      ) : reserva.estado === 'PENDIENTE_PAGO' ? (
        <div className="tarjeta flex flex-col gap-3 p-5">
          {rechazado ? null : <EsperarConfirmacion />}
          <p className="text-sm font-semibold">
            {rechazado ? 'Mercado Pago rechazó el pago.' : 'Esperando la confirmación de Mercado Pago…'}
          </p>
          <p className="text-sm text-tinta-2">
            Te guardamos el turno hasta las{' '}
            {reserva.venceEn?.toLocaleTimeString('es-AR', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: false,
              timeZone: 'America/Argentina/Buenos_Aires',
            })}
            . Apenas se apruebe el pago queda confirmado y te avisamos.
          </p>
          {reserva.mpLinkPago ? (
            <a href={reserva.mpLinkPago} className="btn btn-primario btn-sm self-start">
              {pagoId ? 'Probar con otro medio de pago' : 'Ir a pagar'}
            </a>
          ) : null}
        </div>
      ) : (
        <div className="tarjeta flex flex-col gap-3 p-5">
          <p className="text-sm font-semibold">
            {reserva.pagoEstado === 'REEMBOLSADO'
              ? 'Te devolvimos el pago'
              : 'Este turno ya no está reservado'}
          </p>
          <p className="text-sm text-tinta-2">
            {reserva.pagoEstado === 'REEMBOLSADO'
              ? 'El pago llegó cuando el turno ya no estaba disponible, así que Mercado Pago te lo reintegra.'
              : 'No se completó el pago a tiempo. Si el horario sigue libre, podés pedirlo de nuevo.'}
          </p>
          <Link href={`/canchas/${reserva.canchaId}`} className="btn btn-secundario btn-sm self-start">
            Volver a la cancha
          </Link>
        </div>
      )}
    </div>
  );
}
