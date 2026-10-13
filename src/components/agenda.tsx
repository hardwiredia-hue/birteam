import Link from 'next/link';
import { formatearPlata } from '@/lib/formato';
import { enlaceWhatsApp, type EstadoAgenda, type TurnoAgenda } from '@/lib/agenda';

const ESTADOS: Record<EstadoAgenda, { rotulo: string; color: string }> = {
  PEDIDO: { rotulo: 'Pidió · responder', color: 'var(--naranja-txt)' },
  ESPERANDO_PAGO: { rotulo: 'Esperando pago', color: 'var(--azul-txt)' },
  CONFIRMADO: { rotulo: 'Confirmado', color: 'var(--verde-txt)' },
  FIJO: { rotulo: 'Turno fijo', color: 'var(--verde-txt)' },
  BLOQUEADO: { rotulo: 'Bloqueado', color: 'var(--tinta-3)' },
};

/**
 * La agenda del día, arriba del panel: por hora, quién juega en qué cancha,
 * el estado, la plata y el WhatsApp. Lo que ya pasó queda apagado.
 */
export function Agenda({
  turnos,
  dia,
  fecha,
  rotuloManana,
  base,
  titulo,
}: {
  turnos: TurnoAgenda[];
  dia: 'hoy' | 'manana';
  fecha: string;
  rotuloManana: string;
  /** Pantalla donde vive (para las pestañas Hoy / Mañana). */
  base: '/complejo' | '/panel';
  /** Rótulo arriba (en Inicio de un empleado: "Agenda del complejo"). */
  titulo?: string;
}) {
  const ahora = Date.now();
  const tomados = turnos.filter((t) => t.estado !== 'BLOQUEADO');
  const pedidos = turnos.filter((t) => t.estado === 'PEDIDO').length;
  // A cobrar en el complejo: solo lo confirmado (un pedido todavía puede no ser).
  const aCobrar = turnos
    .filter((t) => t.estado === 'CONFIRMADO' || t.estado === 'FIJO')
    .reduce((total, t) => total + Math.max(0, (t.precio ?? 0) - (t.pagadoOnline ?? 0)), 0);

  return (
    <section className="flex flex-col gap-3">
      {titulo ? <p className="t-rotulo">{titulo}</p> : null}
      <div className="flex items-center justify-between gap-3">
        <div className="flex gap-1 rounded-[8px] border border-borde p-1" role="tablist" aria-label="Día de la agenda">
          {(
            [
              ['hoy', 'Hoy'],
              ['manana', rotuloManana],
            ] as const
          ).map(([clave, rotulo]) => (
            <Link
              key={clave}
              href={clave === 'hoy' ? base : `${base}?agenda=manana`}
              role="tab"
              aria-selected={dia === clave}
              className="rounded-[6px] px-3 py-1.5 text-[13px] font-semibold"
              style={dia === clave ? { background: 'var(--borde)', color: 'var(--tinta)' } : { color: 'var(--tinta-3)' }}
            >
              {rotulo}
            </Link>
          ))}
        </div>
        <p className="t-rotulo text-right tabular">
          {tomados.length} {tomados.length === 1 ? 'turno' : 'turnos'}
          {aCobrar > 0 ? ` · ${formatearPlata(aCobrar)} a cobrar` : ''}
        </p>
      </div>

      {pedidos > 0 ? (
        <p className="aviso-ok border-naranja-txt text-naranja-txt">
          {pedidos === 1 ? 'Hay 1 pedido sin responder' : `Hay ${pedidos} pedidos sin responder`}: si no contestás, se vencen y el
          turno se libera.
        </p>
      ) : null}

      {turnos.length === 0 ? (
        <p className="tarjeta p-4 text-sm text-tinta-2">
          {dia === 'hoy' ? 'Hoy' : 'Mañana'} no hay turnos tomados. Los libres podés publicarlos en el Radar con descuento.
        </p>
      ) : (
        <ol className="tarjeta flex flex-col">
          {turnos.map((turno) => {
            const paso = turno.inicio.getTime() < ahora;
            const estado = ESTADOS[turno.estado];
            const resta = turno.precio != null ? Math.max(0, turno.precio - (turno.pagadoOnline ?? 0)) : null;
            return (
              <li
                key={turno.id}
                className="flex items-start gap-3 border-b border-borde px-4 py-3 last:border-b-0"
                style={paso ? { opacity: 0.5 } : undefined}
              >
                <div className="w-14 shrink-0">
                  <p className="text-[15px] font-bold tabular">{turno.hora}</p>
                  <p className="text-[11px] text-tinta-3 tabular">a {turno.hasta}</p>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{turno.quien}</p>
                  <p className="truncate text-xs text-tinta-3">
                    {turno.cancha}
                    {turno.usuario ? ` · @${turno.usuario}` : ''}
                  </p>
                  <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11.5px] font-semibold">
                    <span style={{ color: estado.color }}>{estado.rotulo}</span>
                    {turno.estado !== 'BLOQUEADO' && resta != null ? (
                      <span className="font-normal text-tinta-2 tabular">
                        {turno.pagadoOnline
                          ? `pagó ${formatearPlata(turno.pagadoOnline)} online${resta > 0 ? ` · resta ${formatearPlata(resta)}` : ''}`
                          : `${formatearPlata(resta)} en el complejo`}
                      </span>
                    ) : null}
                  </p>
                  {turno.nota ? <p className="mt-0.5 truncate text-xs text-tinta-3">"{turno.nota}"</p> : null}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  {turno.estado === 'PEDIDO' ? (
                    <Link
                      href={`/canchas/${turno.canchaId}?fecha=${fecha}&hora=${turno.hora}`}
                      className="text-xs font-semibold text-naranja-txt"
                    >
                      Responder
                    </Link>
                  ) : null}
                  {turno.telefono ? (
                    <a
                      href={enlaceWhatsApp(turno.telefono)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-semibold text-verde-txt"
                    >
                      WhatsApp
                    </a>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
