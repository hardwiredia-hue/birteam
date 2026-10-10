import { prisma } from '@/lib/db';
import { formatearPlata } from '@/lib/formato';
import { comisionPorcentaje, mercadoPagoHabilitado, pagosSimulados, simulacionPermitida } from '@/lib/mercadopago';
import { EditarComision, InterruptorSimulador } from './comision';

export const metadata = { title: 'Pagos' };
export const dynamic = 'force-dynamic';

const ROTULO_PAGO: Record<string, string> = {
  approved: 'Aprobado',
  rejected: 'Rechazado',
  refunded: 'Devuelto',
  pending: 'Pendiente',
  in_process: 'En proceso',
  cancelled: 'Cancelado',
  charged_back: 'Contracargo',
};

/** Cobros online: configuración, comisión, últimos pagos y registro de eventos. */
export default async function Pagos() {
  const hace30 = new Date(Date.now() - 30 * 24 * 3600_000);
  const [comision, cuentas, pagos, eventos, aprobados30] = await Promise.all([
    comisionPorcentaje(),
    prisma.cuentaMercadoPago.count(),
    prisma.pagoMercadoPago.findMany({
      orderBy: { creadoEn: 'desc' },
      take: 30,
      include: { reserva: { select: { fecha: true, hora: true, cancha: { select: { nombre: true } } } } },
    }),
    prisma.eventoPago.findMany({ orderBy: { creadoEn: 'desc' }, take: 40 }),
    prisma.pagoMercadoPago.findMany({
      where: { estado: 'approved', creadoEn: { gte: hace30 } },
      select: { monto: true, comision: true },
    }),
  ]);
  const [simuladorPrendido, permitido] = [await pagosSimulados(), simulacionPermitida()];
  const volumen = aprobados30.reduce((suma, p) => suma + p.monto, 0);
  const comisiones = aprobados30.reduce((suma, p) => suma + (p.comision ?? 0), 0);

  // Solo si cada variable está o no: nunca se muestran sus valores.
  const configuracion = [
    ['MP_CLIENT_ID', Boolean(process.env.MP_CLIENT_ID)],
    ['MP_CLIENT_SECRET', Boolean(process.env.MP_CLIENT_SECRET)],
    ['MP_CLAVE_CIFRADO', /^[0-9a-f]{64}$/i.test(process.env.MP_CLAVE_CIFRADO ?? '')],
    ['MP_WEBHOOK_SECRET', Boolean(process.env.MP_WEBHOOK_SECRET)],
    ['URL_PUBLICA', Boolean(process.env.URL_PUBLICA)],
  ] as const;

  return (
    <div className="flex flex-col gap-5">
      <section className="tarjeta flex flex-col gap-2 p-5">
        <p className="t-rotulo">Mercado Pago</p>
        <p className="text-sm font-semibold">
          {mercadoPagoHabilitado() ? 'Cobro online habilitado' : 'Cobro online apagado: falta configuración'}
        </p>
        <div className="flex flex-wrap gap-2">
          {configuracion.map(([nombre, ok]) => (
            <span key={nombre} className="t-rotulo" style={{ color: ok ? 'var(--verde-txt)' : 'var(--rojo)' }}>
              {ok ? '✓' : '✗'} {nombre}
            </span>
          ))}
        </div>
        <p className="text-xs text-tinta-3">
          Ver deploy/PUBLICAR.md › “Cobros con Mercado Pago”. {cuentas} {cuentas === 1 ? 'complejo conectado' : 'complejos conectados'}.
        </p>
      </section>

      {permitido ? (
        <section className="tarjeta flex flex-col gap-2 p-5" style={{ borderColor: 'var(--naranja-txt)' }}>
          <p className="t-rotulo text-naranja-txt">Simulador de pagos · solo staging</p>
          <p className="text-sm">
            {simuladorPrendido
              ? 'Prendido: los complejos conectan una cuenta de prueba y los pagos se aprueban o rechazan a mano. No se cobra nada.'
              : 'Apagado. Prendelo para probar todo el circuito de cobro sin credenciales de Mercado Pago.'}
          </p>
          <InterruptorSimulador prendido={simuladorPrendido} />
          <p className="text-xs text-tinta-3">
            Las cuentas y pagos del simulador nunca se mezclan con los reales: con credenciales
            cargadas, apagalo y cada complejo conecta su cuenta de verdad.
          </p>
        </section>
      ) : null}

      <section className="tarjeta flex flex-col gap-2 p-5">
        <p className="t-rotulo">Comisión de birteam sobre cobros online</p>
        <EditarComision inicial={comision} />
        <p className="text-xs text-tinta-3">
          Se aplica a los links de pago nuevos (marketplace_fee) y se le muestra al complejo antes de
          activar el cobro. Los ya generados no cambian.
        </p>
      </section>

      <section className="grid grid-cols-2 gap-2">
        <div className="tarjeta px-3 py-4 text-center">
          <p className="t-display text-[22px] tabular">{formatearPlata(volumen)}</p>
          <p className="t-rotulo mt-1 text-[9.5px]">Cobrado online · 30 días</p>
        </div>
        <div className="tarjeta px-3 py-4 text-center">
          <p className="t-display text-[22px] tabular">{formatearPlata(comisiones)}</p>
          <p className="t-rotulo mt-1 text-[9.5px]">Comisión informada por MP</p>
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <p className="t-rotulo">Últimos pagos</p>
        {pagos.length === 0 ? (
          <p className="tarjeta p-4 text-sm text-tinta-2">Todavía no hubo pagos online.</p>
        ) : (
          pagos.map((pago) => (
            <div key={pago.id} className="tarjeta flex items-center justify-between gap-3 p-3 text-sm">
              <span className="min-w-0 truncate">
                {pago.reserva.cancha.nombre} · {pago.reserva.fecha} {pago.reserva.hora}
                <span className="text-tinta-3"> · MP #{pago.mpPaymentId}</span>
              </span>
              <span className="shrink-0 tabular">
                {formatearPlata(pago.monto)} · {ROTULO_PAGO[pago.estado] ?? pago.estado}
              </span>
            </div>
          ))
        )}
      </section>

      <section className="flex flex-col gap-1">
        <p className="t-rotulo mb-1">Registro de eventos</p>
        {eventos.length === 0 ? (
          <p className="text-sm text-tinta-3">Sin eventos.</p>
        ) : (
          eventos.map((evento) => (
            <p key={evento.id} className="text-xs text-tinta-2">
              <span className="tabular text-tinta-3">
                {evento.creadoEn.toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' })}
              </span>{' '}
              <span className="font-semibold">{evento.tipo}</span>
              {evento.detalle ? ` · ${evento.detalle}` : ''}
            </p>
          ))
        )}
      </section>
    </div>
  );
}
