import Link from 'next/link';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { usuarioActual } from '@/lib/auth';
import { formatearPlata } from '@/lib/formato';
import { suscripcionActiva } from '@/lib/suscripcion';
import { comisionPorcentaje, mercadoPagoHabilitado } from '@/lib/mercadopago';
import { DesconectarMercadoPago } from './mercadopago';
import { formatearPuntaje } from '@/lib/resenas';
import {
  ESTADOS_ACTIVOS,
  MINUTOS_ANTICIPACION,
  diaDeSemana,
  diasDeLaCancha,
  horariosDelDia,
  inicioDelTurno,
  liberarVencidas,
  proximosDias,
  rotuloDia,
  seSuperponen,
} from '@/lib/reservas';

export const metadata = { title: 'Mi complejo' };
export const dynamic = 'force-dynamic';

/**
 * Panel del dueño: todo sale de las reservas reales. Ocupación de los
 * próximos 7 días, pedidos sin responder, lo cobrado en el complejo por
 * turnos confirmados y los huecos que conviene publicar en el Radar.
 */
const MENSAJES_MP: Record<string, { texto: string; error?: boolean }> = {
  conectada: { texto: '¡Listo! Tu cuenta de Mercado Pago quedó conectada. Elegí en cada cancha si cobrás seña o el turno completo.' },
  error: { texto: 'No se pudo conectar Mercado Pago. Probá de nuevo.', error: true },
  no_disponible: { texto: 'El cobro online todavía no está habilitado en birteam.', error: true },
};

export default async function MiComplejo({
  searchParams,
}: {
  searchParams: Promise<{ mp?: string }>;
}) {
  const { mp } = await searchParams;
  const usuario = (await usuarioActual())!;
  if (usuario.tipoCuenta !== 'CANCHA') redirect('/perfil');
  await liberarVencidas();

  const ahora = new Date();
  const hace30 = new Date(ahora.getTime() - 30 * 24 * 3600_000);
  const dias = proximosDias(7);
  const limite = ahora.getTime() + MINUTOS_ANTICIPACION * 60_000;

  const canchas = await prisma.cancha.findMany({
    where: { duenoId: usuario.id },
    include: { deporte: { select: { nombre: true } } },
    orderBy: { creadoEn: 'asc' },
  });
  const ids = canchas.map((c) => c.id);

  const [proximas, ultimas, pendientes, ofertas, resenas] = await Promise.all([
    prisma.reserva.findMany({
      where: { canchaId: { in: ids }, fecha: { in: dias }, estado: { in: ESTADOS_ACTIVOS } },
      select: { canchaId: true, inicio: true, duracion: true, estado: true },
    }),
    prisma.reserva.findMany({
      where: { canchaId: { in: ids }, inicio: { gte: hace30, lt: ahora } },
      select: { estado: true, precio: true, ofertaId: true },
    }),
    prisma.reserva.count({ where: { canchaId: { in: ids }, estado: 'SOLICITADA', inicio: { gte: ahora } } }),
    prisma.ofertaTurno.findMany({
      where: { canchaId: { in: ids }, inicio: { gte: ahora } },
      select: { canchaId: true, fecha: true, hora: true },
    }),
    prisma.resenaCancha.groupBy({
      by: ['canchaId'],
      where: { canchaId: { in: ids } },
      _avg: { puntaje: true },
      _count: { _all: true },
    }),
  ]);

  // Por cancha: turnos que quedan en los próximos 7 días, cuántos están tomados y los huecos cercanos.
  const porCancha = canchas.map((cancha) => {
    const abiertos = diasDeLaCancha(cancha.diasDisponibles);
    const horarios = horariosDelDia(cancha);
    const tomadas = proximas.filter((r) => r.canchaId === cancha.id);
    let total = 0;
    let ocupados = 0;
    const huecos: { fecha: string; hora: string; enRadar: boolean }[] = [];
    for (const fecha of dias) {
      if (!abiertos.includes(diaDeSemana(fecha))) continue;
      for (const hora of horarios) {
        const inicio = inicioDelTurno(fecha, hora).getTime();
        if (inicio < limite) continue;
        total++;
        const tomada = tomadas.some((r) => seSuperponen(inicio, cancha.duracionTurno, r.inicio.getTime(), r.duracion));
        if (tomada) ocupados++;
        else if (fecha === dias[0] || fecha === dias[1]) {
          huecos.push({
            fecha,
            hora,
            enRadar: ofertas.some((o) => o.canchaId === cancha.id && o.fecha === fecha && o.hora === hora),
          });
        }
      }
    }
    const resena = resenas.find((r) => r.canchaId === cancha.id);
    return {
      cancha,
      total,
      ocupados,
      huecos,
      pendientes: tomadas.filter((r) => r.estado === 'SOLICITADA').length,
      puntaje: resena ? { promedio: resena._avg.puntaje ?? 0, cantidad: resena._count._all } : null,
    };
  });

  const totalTurnos = porCancha.reduce((suma, c) => suma + c.total, 0);
  const totalOcupados = porCancha.reduce((suma, c) => suma + c.ocupados, 0);
  const jugadas = ultimas.filter((r) => r.estado === 'CONFIRMADA');
  const cobrado = jugadas.reduce((suma, r) => suma + (r.precio ?? 0), 0);
  const porRadar = jugadas.filter((r) => r.ofertaId).length;
  const canceladas = ultimas.filter((r) => r.estado === 'CANCELADA').length;
  const activa = suscripcionActiva(usuario);
  const [cuentaMp, comision] = await Promise.all([
    prisma.cuentaMercadoPago.findUnique({
      where: { usuarioId: usuario.id },
      select: { conectadoEn: true, expiraEn: true, refreshToken: true },
    }),
    comisionPorcentaje(),
  ]);
  const mpVigente = Boolean(cuentaMp && (cuentaMp.expiraEn > ahora || cuentaMp.refreshToken));
  const cobrando = canchas.filter((c) => c.cobroOnline !== 'NO').length;

  return (
    <div className="flex flex-col gap-6">
      <header>
        <p className="t-rotulo text-verde-txt">Panel del complejo</p>
        <h1 className="t-pantalla mt-1">{usuario.complejoNombre ?? 'Mi complejo'}</h1>
        <p className="mt-1 text-xs text-tinta-3">
          {activa && usuario.suscripcionHasta
            ? `Suscripción al día hasta el ${usuario.suscripcionHasta.toLocaleDateString('es-AR', { day: 'numeric', month: 'long', timeZone: 'America/Argentina/Buenos_Aires' })}`
            : 'Suscripción vencida: tus canchas no se ven. Escribinos a hola@birteam.com.'}
          {usuario.verificacion === 'VERIFICADA' ? ' · titularidad verificada ✓' : ''}
        </p>
      </header>

      {mp && MENSAJES_MP[mp] ? (
        <p className={MENSAJES_MP[mp].error ? 'aviso-error' : 'aviso-ok'}>{MENSAJES_MP[mp].texto}</p>
      ) : null}

      {mercadoPagoHabilitado() ? (
        <section className="tarjeta flex flex-col gap-3 p-4">
          <div>
            <p className="t-rotulo text-verde-txt">Cobro online · Mercado Pago</p>
            {mpVigente ? (
              <p className="mt-1 text-sm">
                Cuenta conectada
                {cuentaMp
                  ? ` desde el ${cuentaMp.conectadoEn.toLocaleDateString('es-AR', { day: 'numeric', month: 'long', timeZone: 'America/Argentina/Buenos_Aires' })}`
                  : ''}
                . {cobrando > 0
                  ? `${cobrando} ${cobrando === 1 ? 'cancha cobra' : 'canchas cobran'} online.`
                  : 'Elegí en cada cancha (Editar) si cobrás seña o el turno completo.'}
              </p>
            ) : (
              <p className="mt-1 text-sm text-tinta-2">
                {cuentaMp
                  ? 'La conexión venció: volvé a conectar tu cuenta para seguir cobrando online.'
                  : 'Cobrá la seña o el turno completo al reservar: el turno se confirma solo y se acaban los “después te aviso”. La plata va directo a tu cuenta de Mercado Pago.'}
              </p>
            )}
            <p className="mt-1 text-xs text-tinta-3">
              {comision > 0
                ? `birteam retiene un ${comision}% de cada cobro online; la comisión de Mercado Pago la descuenta Mercado Pago.`
                : 'Por ahora birteam no cobra comisión; la comisión de Mercado Pago la descuenta Mercado Pago.'}{' '}
              Cancelaciones del complejo, o del jugador con más de 6 h, se devuelven automáticamente.
            </p>
          </div>
          {mpVigente ? (
            <DesconectarMercadoPago />
          ) : (
            <a href="/api/mercadopago/conectar" className="btn btn-primario btn-sm self-start">
              {cuentaMp ? 'Volver a conectar' : 'Conectar Mercado Pago'}
            </a>
          )}
        </section>
      ) : null}

      {canchas.length === 0 ? (
        <div className="tarjeta flex flex-col gap-3 p-5">
          <p className="text-sm text-tinta-2">Todavía no publicaste canchas. Arrancá por la primera.</p>
          <Link href="/canchas/nueva" className="btn btn-primario self-start">
            Publicar una cancha
          </Link>
        </div>
      ) : (
        <>
          {pendientes > 0 ? (
            <Link href="/reservas" className="tarjeta flex items-center justify-between gap-3 p-4" style={{ borderColor: 'var(--naranja-txt)' }}>
              <span className="text-sm font-semibold">
                {pendientes === 1 ? '1 pedido de turno' : `${pendientes} pedidos de turno`} esperando tu respuesta
              </span>
              <span className="text-naranja-txt">→</span>
            </Link>
          ) : null}

          <section className="flex flex-col gap-2">
            <p className="t-rotulo">Próximos 7 días</p>
            <div className="grid grid-cols-3 gap-2">
              <Dato valor={totalTurnos > 0 ? `${Math.round((totalOcupados / totalTurnos) * 100)}%` : '—'} rotulo="Ocupación" />
              <Dato valor={String(totalOcupados)} rotulo="Turnos tomados" />
              <Dato valor={String(totalTurnos - totalOcupados)} rotulo="Libres" />
            </div>
          </section>

          <section className="flex flex-col gap-2">
            <p className="t-rotulo">Últimos 30 días</p>
            <div className="grid grid-cols-3 gap-2">
              <Dato valor={String(jugadas.length)} rotulo="Turnos jugados" />
              <Dato valor={cobrado > 0 ? formatearPlata(cobrado) : '$0'} rotulo="Cobrado" />
              <Dato valor={String(porRadar)} rotulo="Vendidos por Radar" />
            </div>
            <p className="text-xs text-tinta-3">
              “Cobrado” suma el precio de los turnos confirmados que ya pasaron, pagados en el
              complejo o por Mercado Pago.
              {canceladas > 0 ? ` Cancelaciones en el período: ${canceladas}.` : ''}
            </p>
          </section>

          <section className="flex flex-col gap-3">
            <div className="flex items-baseline justify-between">
              <p className="t-rotulo">Tus canchas</p>
              <Link href="/canchas/nueva" className="text-xs font-semibold text-verde-txt">
                + Publicar otra
              </Link>
            </div>
            {porCancha.map(({ cancha, total, ocupados, huecos, pendientes: pedidos, puntaje }) => (
              <article key={cancha.id} className="tarjeta flex flex-col gap-3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="t-rotulo text-verde-txt">
                      {cancha.deporte.nombre}
                      {!cancha.activa ? <span className="ml-2 text-rojo">pausada</span> : null}
                      {!cancha.reservasOnline ? <span className="ml-2 text-tinta-3">sin pedidos online</span> : null}
                    </p>
                    <Link href={`/canchas/${cancha.id}`} className="t-display mt-0.5 block truncate text-[18px]">
                      {cancha.nombre}
                    </Link>
                  </div>
                  {puntaje ? (
                    <span className="shrink-0 text-xs font-semibold text-naranja-txt">
                      ★ {formatearPuntaje(puntaje.promedio)} ({puntaje.cantidad})
                    </span>
                  ) : null}
                </div>
                <div>
                  <div className="flex items-baseline justify-between text-xs text-tinta-3">
                    <span>
                      {ocupados} de {total} turnos tomados
                      {pedidos > 0 ? ` · ${pedidos} sin confirmar` : ''}
                    </span>
                    <span className="tabular">{total > 0 ? `${Math.round((ocupados / total) * 100)}%` : '—'}</span>
                  </div>
                  <div className="barra-progreso mt-1">
                    <i style={{ width: `${total > 0 ? Math.round((ocupados / total) * 100) : 0}%` }} />
                  </div>
                </div>
                {huecos.length > 0 ? (
                  <div className="flex flex-col gap-1.5">
                    <p className="text-xs text-tinta-2">
                      Libres hoy y mañana — tocá uno para bloquearlo o publicarlo en el Radar:
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {huecos.slice(0, 12).map((hueco) => (
                        <Link
                          key={`${hueco.fecha}-${hueco.hora}`}
                          href={`/canchas/${cancha.id}?fecha=${hueco.fecha}&hora=${hueco.hora}`}
                          className="rounded-[6px] border px-2 py-1 text-xs font-semibold tabular"
                          style={{
                            borderColor: hueco.enRadar ? 'var(--naranja-txt)' : 'var(--borde-2)',
                            color: hueco.enRadar ? 'var(--naranja-txt)' : 'var(--tinta-2)',
                          }}
                        >
                          {hueco.fecha === dias[0] ? 'Hoy' : rotuloDia(hueco.fecha).split(' ')[0]} {hueco.hora}
                          {hueco.enRadar ? ' · Radar' : ''}
                        </Link>
                      ))}
                      {huecos.length > 12 ? (
                        <span className="px-1 py-1 text-xs text-tinta-3">+{huecos.length - 12} más</span>
                      ) : null}
                    </div>
                  </div>
                ) : total > 0 ? (
                  <p className="text-xs text-verde-txt">Hoy y mañana, todo tomado. 🙌</p>
                ) : null}
                <div className="flex gap-2">
                  <Link href={`/canchas/${cancha.id}`} className="btn btn-secundario btn-sm">
                    Grilla de turnos
                  </Link>
                  <Link href={`/canchas/${cancha.id}/editar`} className="btn btn-fantasma btn-sm">
                    Editar
                  </Link>
                </div>
              </article>
            ))}
          </section>
        </>
      )}
    </div>
  );
}

function Dato({ valor, rotulo }: { valor: string; rotulo: string }) {
  return (
    <div className="tarjeta px-2 py-3 text-center">
      <p className="t-display text-[20px] tabular">{valor}</p>
      <p className="t-rotulo mt-1 text-[9.5px]">{rotulo}</p>
    </div>
  );
}
