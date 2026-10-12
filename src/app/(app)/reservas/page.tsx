import Link from 'next/link';
import { prisma } from '@/lib/db';
import { duenosQueGestiono } from '@/lib/gestion';
import { usuarioActual } from '@/lib/auth';
import { formatearPlata } from '@/lib/formato';
import {
  DIAS_PARA_MARCAR_FALTA,
  ROTULOS_ESTADO,
  claveDia,
  historialDeTurnos,
  liberarVencidas,
  rotuloDia,
  rotuloHistorial,
} from '@/lib/reservas';
import { equipoDelComplejo } from '@/lib/gestion';
import { rotuloFijo } from '@/lib/turnos-fijos';
import { AccionesReserva } from './acciones';
import { DejarFijo } from './dejar-fijo';
import { MarcarAsistencia } from './asistencia';

export const metadata = { title: 'Reservas' };
export const dynamic = 'force-dynamic';

const COLOR_ESTADO: Record<string, string> = {
  PENDIENTE_PAGO: 'var(--naranja-txt)',
  SOLICITADA: 'var(--naranja-txt)',
  CONFIRMADA: 'var(--verde-txt)',
  BLOQUEO: 'var(--azul-txt)',
};

/**
 * Turnos de cancha. El jugador ve sus pedidos y reservas; el dueño, además,
 * los pedidos que esperan su respuesta y la agenda de sus canchas.
 */
export default async function Reservas() {
  const usuario = (await usuarioActual())!;
  await liberarVencidas();

  const ahora = new Date();
  // Un turno sigue "en curso" hasta 2 h después de arrancar.
  const desde = new Date(ahora.getTime() - 2 * 3600_000);
  // Complejos cuyos turnos gestiona: el propio (si es dueño) y donde es empleado.
  const duenos = await duenosQueGestiono(usuario.id, usuario.tipoCuenta);
  const esDueno = duenos.length > 0;

  const [mias, historial, pendientes, agenda, misFijos, esperando] = await Promise.all([
    prisma.reserva.findMany({
      where: {
        usuarioId: usuario.id,
        estado: { in: ['SOLICITADA', 'PENDIENTE_PAGO', 'CONFIRMADA'] },
        inicio: { gte: desde },
        cancha: { duenoId: { notIn: duenos } },
      },
      include: { cancha: { select: { id: true, nombre: true, direccion: true, telefono: true, horasCancelacion: true } } },
      orderBy: { inicio: 'asc' },
    }),
    prisma.reserva.findMany({
      where: {
        usuarioId: usuario.id,
        cancha: { duenoId: { notIn: duenos } },
        OR: [
          { estado: { in: ['RECHAZADA', 'CANCELADA', 'VENCIDA'] } },
          { inicio: { lt: desde } },
        ],
      },
      include: { cancha: { select: { id: true, nombre: true } } },
      orderBy: { inicio: 'desc' },
      take: 10,
    }),
    esDueno
      ? prisma.reserva.findMany({
          where: { cancha: { duenoId: { in: duenos } }, estado: 'SOLICITADA', inicio: { gte: ahora } },
          include: {
            cancha: { select: { id: true, nombre: true } },
            usuario: { select: { nombre: true, usuario: true } },
          },
          orderBy: { inicio: 'asc' },
        })
      : [],
    esDueno
      ? prisma.reserva.findMany({
          where: {
            cancha: { duenoId: { in: duenos } },
            estado: { in: ['CONFIRMADA', 'BLOQUEO'] },
            inicio: { gte: desde },
          },
          include: {
            cancha: { select: { id: true, nombre: true } },
            usuario: { select: { nombre: true, usuario: true } },
          },
          orderBy: { inicio: 'asc' },
          take: 40,
        })
      : [],
    prisma.turnoFijo.findMany({
      where: { usuarioId: usuario.id, activo: true },
      include: { cancha: { select: { id: true, nombre: true, direccion: true } } },
      orderBy: [{ diaSemana: 'asc' }, { hora: 'asc' }],
    }),
    prisma.alertaTurno.findMany({
      where: { usuarioId: usuario.id, avisadoEn: null, fecha: { gte: claveDia() } },
      include: { cancha: { select: { id: true, nombre: true } } },
      orderBy: [{ fecha: 'asc' }, { hora: 'asc' }],
    }),
  ]);

  // Turnos ya jugados en sus canchas: para marcar si alguien no fue.
  const equipo = esDueno ? (await Promise.all(duenos.map(equipoDelComplejo))).flat() : [];
  const jugados = esDueno
    ? await prisma.reserva.findMany({
        where: {
          cancha: { duenoId: { in: duenos } },
          estado: 'CONFIRMADA',
          inicio: { lt: desde, gte: new Date(ahora.getTime() - DIAS_PARA_MARCAR_FALTA * 86400_000) },
          usuarioId: { notIn: equipo },
        },
        include: {
          cancha: { select: { nombre: true } },
          usuario: { select: { nombre: true } },
        },
        orderBy: { inicio: 'desc' },
        take: 20,
      })
    : [];
  // Historial de quienes piden: lo que ayuda a decidir si confirmar.
  const antecedentes = await historialDeTurnos(pendientes.map((reserva) => reserva.usuarioId));

  const nada = mias.length === 0 && historial.length === 0 && pendientes.length === 0 && agenda.length === 0;

  return (
    <div className="flex flex-col gap-6">
      <header>
        <div className="flex items-center justify-between gap-3">
          <h1 className="t-pantalla">Reservas</h1>
          <Link href="/turnos" className="text-sm font-semibold text-verde-txt">
            Buscar turno
          </Link>
        </div>
        <p className="mt-1 text-sm text-tinta-2">
          Pedís el turno desde la cancha, el complejo lo confirma y se paga allá.
        </p>
      </header>

      {esDueno ? (
        <section className="flex flex-col gap-2">
          <p className="t-rotulo text-naranja-txt">
            Pedidos para confirmar{pendientes.length > 0 ? ` · ${pendientes.length}` : ''}
          </p>
          {pendientes.length === 0 ? (
            <p className="tarjeta p-4 text-sm text-tinta-2">No tenés pedidos esperando respuesta.</p>
          ) : (
            pendientes.map((reserva) => (
              <div key={reserva.id} className="tarjeta flex flex-col gap-3 p-4">
                <div>
                  <p className="text-sm font-semibold">
                    {rotuloDia(reserva.fecha)} · {reserva.hora} · {reserva.cancha.nombre}
                  </p>
                  <p className="mt-0.5 text-xs text-tinta-3">
                    <Link href={`/jugadores/${reserva.usuario.usuario}`} className="font-semibold text-tinta-2">
                      {reserva.usuario.nombre}
                    </Link>
                    {reserva.precio != null ? ` · ${formatearPlata(reserva.precio)}` : ''}
                    {reserva.venceEn
                      ? ` · se libera ${reserva.venceEn.toLocaleString('es-AR', {
                          weekday: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: false,
                          timeZone: 'America/Argentina/Buenos_Aires',
                        })} si no respondés`
                      : ''}
                  </p>
                  <p
                    className="mt-1 text-xs"
                    style={{ color: (antecedentes.get(reserva.usuarioId)?.faltas ?? 0) > 0 ? 'var(--naranja-txt)' : 'var(--tinta-3)' }}
                  >
                    {rotuloHistorial(antecedentes.get(reserva.usuarioId))}
                  </p>
                  {reserva.nota ? <p className="mt-1 text-xs text-tinta-2">“{reserva.nota}”</p> : null}
                </div>
                <AccionesReserva reservaId={reserva.id} estado={reserva.estado} esDueno />
              </div>
            ))
          )}
        </section>
      ) : null}

      {esDueno && agenda.length > 0 ? (
        <section className="flex flex-col gap-2">
          <p className="t-rotulo">Agenda de tus canchas</p>
          {agenda.map((reserva) => (
            <div key={reserva.id} className="tarjeta flex items-start justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="text-sm font-semibold">
                  {rotuloDia(reserva.fecha)} · {reserva.hora} · {reserva.cancha.nombre}
                </p>
                <p className="mt-0.5 text-xs" style={{ color: COLOR_ESTADO[reserva.estado] }}>
                  {reserva.estado === 'BLOQUEO'
                    ? `Bloqueado${reserva.nota ? ` · ${reserva.nota}` : ''}`
                    : `${reserva.usuario.nombre}${reserva.turnoFijoId ? ' · turno fijo' : ''}${reserva.precio != null ? ` · ${formatearPlata(reserva.precio)}` : ''}`}
                </p>
              </div>
              <AccionesReserva reservaId={reserva.id} estado={reserva.estado} esDueno />
            </div>
          ))}
        </section>
      ) : null}

      {misFijos.length > 0 ? (
        <section className="flex flex-col gap-2">
          <p className="t-rotulo">Tus turnos fijos</p>
          {misFijos.map((fijo) => (
            <div key={fijo.id} className="tarjeta flex items-start justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="t-display text-[18px]">{rotuloFijo(fijo)}</p>
                <Link href={`/canchas/${fijo.cancha.id}`} className="text-sm font-semibold">
                  {fijo.cancha.nombre}
                </Link>
                <p className="mt-0.5 text-xs text-tinta-3">
                  Todas las semanas · {fijo.cancha.direccion}. Si una semana no van, cancelala abajo.
                </p>
              </div>
              <DejarFijo canchaId={fijo.cancha.id} fijoId={fijo.id} rotulo={rotuloFijo(fijo).toLowerCase()} />
            </div>
          ))}
        </section>
      ) : null}

      {jugados.length > 0 ? (
        <section className="flex flex-col gap-2">
          <p className="t-rotulo">Ya jugados · ¿faltó alguien?</p>
          <div className="tarjeta flex flex-col">
            {jugados.map((reserva) => (
              <div key={reserva.id} className="flex items-center justify-between gap-3 border-b border-borde px-4 py-3 last:border-b-0">
                <div className="min-w-0 text-sm">
                  <p className="truncate font-semibold">
                    {reserva.usuario.nombre}
                    {reserva.noVino ? <span className="ml-2 text-xs font-semibold text-naranja-txt">no vino</span> : null}
                  </p>
                  <p className="truncate text-xs text-tinta-3">
                    {rotuloDia(reserva.fecha)} · {reserva.hora} · {reserva.cancha.nombre}
                  </p>
                </div>
                <MarcarAsistencia reservaId={reserva.id} noVino={reserva.noVino} jugador={reserva.usuario.nombre} />
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="flex flex-col gap-2">
        <p className="t-rotulo">{esDueno ? 'Tus turnos como jugador' : 'Tus próximos turnos'}</p>
        {mias.length === 0 ? (
          <div className="tarjeta flex flex-col gap-3 p-4">
            <p className="text-sm text-tinta-2">
              No tenés turnos pedidos. Buscá una cancha y elegí el horario que te quede bien.
            </p>
            <Link href="/turnos" className="btn btn-primario btn-sm self-start">
              Buscar turno
            </Link>
          </div>
        ) : (
          mias.map((reserva) => (
            <div key={reserva.id} className="tarjeta flex flex-col gap-3 p-4">
              <div>
                <Link href={`/canchas/${reserva.cancha.id}`} className="text-sm font-semibold">
                  {reserva.cancha.nombre}
                </Link>
                <p className="t-display mt-1 text-[20px]">
                  {rotuloDia(reserva.fecha)} · {reserva.hora}
                  {reserva.turnoFijoId ? <span className="t-rotulo ml-2 text-verde-txt">fijo</span> : null}
                </p>
                <p className="mt-1 text-xs" style={{ color: COLOR_ESTADO[reserva.estado] }}>
                  {ROTULOS_ESTADO[reserva.estado]}
                  {reserva.pagoEstado === 'APROBADO' && reserva.montoOnline != null ? (
                    <span className="text-tinta-3">
                      {' '}· pagaste {formatearPlata(reserva.montoOnline)} online
                      {reserva.precio != null && reserva.precio > reserva.montoOnline
                        ? `, faltan ${formatearPlata(reserva.precio - reserva.montoOnline)} en el complejo`
                        : ''}
                    </span>
                  ) : reserva.pagoEstado === 'REEMBOLSADO' ? (
                    <span className="text-tinta-3"> · pago devuelto</span>
                  ) : reserva.precio != null && reserva.estado !== 'PENDIENTE_PAGO' ? (
                    <span className="text-tinta-3"> · {formatearPlata(reserva.precio)}, se paga en el complejo</span>
                  ) : null}
                </p>
                {reserva.estado === 'PENDIENTE_PAGO' && reserva.mpLinkPago ? (
                  <a href={reserva.mpLinkPago} className="btn btn-primario btn-sm mt-2 inline-flex">
                    Pagar {reserva.montoOnline != null ? formatearPlata(reserva.montoOnline) : ''} con Mercado Pago
                  </a>
                ) : null}
                <p className="mt-0.5 text-xs text-tinta-3">
                  {reserva.cancha.direccion}
                  {reserva.cancha.telefono ? ` · ${reserva.cancha.telefono}` : ''}
                </p>
                {reserva.partidoId ? (
                  <Link href={`/partidos/${reserva.partidoId}`} className="mt-1 inline-block text-xs font-semibold text-verde-txt">
                    Ver el partido armado →
                  </Link>
                ) : null}
              </div>
              <AccionesReserva
                reservaId={reserva.id}
                estado={reserva.estado}
                esDueno={false}
                cancelable={
                  reserva.estado !== 'CONFIRMADA' ||
                  reserva.inicio.getTime() - ahora.getTime() >= reserva.cancha.horasCancelacion * 3600_000
                }
                armarPartido={
                  reserva.partidoId
                    ? null
                    : `/crear?cancha=${reserva.cancha.id}&fecha=${reserva.fecha}&hora=${reserva.hora}&reserva=${reserva.id}`
                }
              />
            </div>
          ))
        )}
      </section>

      {esperando.length > 0 ? (
        <section className="flex flex-col gap-2">
          <p className="t-rotulo">Esperando que se liberen</p>
          <div className="tarjeta flex flex-col">
            {esperando.map((alerta) => (
              <Link
                key={alerta.id}
                href={`/canchas/${alerta.cancha.id}?fecha=${alerta.fecha}&hora=${alerta.hora}`}
                className="flex items-center justify-between gap-3 border-b border-borde px-4 py-3 text-sm last:border-b-0"
              >
                <span className="min-w-0 truncate">
                  {rotuloDia(alerta.fecha)} · {alerta.hora} · {alerta.cancha.nombre}
                </span>
                <span className="shrink-0 text-xs font-semibold text-azul-txt">Te avisamos</span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {historial.length > 0 ? (
        <section className="flex flex-col gap-2">
          <p className="t-rotulo">Anteriores</p>
          {historial.map((reserva) => (
            <Link
              key={reserva.id}
              href={`/canchas/${reserva.cancha.id}`}
              className="tarjeta flex items-center justify-between gap-3 p-3.5 opacity-70"
            >
              <span className="min-w-0 truncate text-sm">
                {rotuloDia(reserva.fecha)} · {reserva.hora} · {reserva.cancha.nombre}
              </span>
              <span className="shrink-0 text-xs text-tinta-3">
                {reserva.inicio < desde && reserva.estado === 'CONFIRMADA' ? 'Jugado' : ROTULOS_ESTADO[reserva.estado]}
              </span>
            </Link>
          ))}
        </section>
      ) : null}

      {nada && esDueno ? (
        <p className="text-xs text-tinta-3">
          Los pedidos llegan desde la grilla de turnos de cada cancha. Revisá en “Editar la cancha”
          el horario y que estén prendidos los pedidos online.
        </p>
      ) : null}
    </div>
  );
}
