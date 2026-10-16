import Link from 'next/link';
import { PronosticoPartido } from '@/components/pronostico';
import { hayPronostico } from '@/lib/pronostico';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { ROTULOS_NIVEL } from '@/lib/constantes';
import { claveDia, turnosLibresParaPartido } from '@/lib/reservas';
import { VincularTurno } from './vincular';
import { usuarioActual } from '@/lib/auth';
import { ComoLlegar } from '@/components/como-llegar';
import { kmHasta, ubicacionDe } from '@/lib/ubicacion';
import { formatearPlata, diaDeLaSemana } from '@/lib/formato';
import { Chat } from '@/components/chat';
import { Moderacion } from '@/components/moderacion';
import { PublicarJugada, TarjetaJugada } from '@/components/jugadas';
import { obtenerJugadas } from '@/lib/jugadas';
import { Avatar } from '@/components/avatar';
import { Equipos } from './equipos';
import { Pagos } from './pagos';
import { FiguraDelPartido } from './figura';
import { HORAS_VOTACION, contarVotos, estadoVotacion, jugaron } from '@/lib/figura';
import { AgregarCalendario } from '@/components/agregar-calendario';
import { eventoDe } from '@/lib/calendario-eventos';
import { enlaceGoogle } from '@/lib/calendario';
import {
  BotoneraRsvp, BarraVoy, CerrarLista,
  CancelarPartido,
  CompartirPartido,
  ElegirCoorganizador,
  PasarLista,
} from './acciones';

export const metadata = { title: 'Partido' };
export const dynamic = 'force-dynamic';

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

export default async function PaginaPartido({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const usuario = (await usuarioActual())!;

  const partido = await prisma.partido.findUnique({
    where: { id },
    include: {
      deporte: true,
      grupo: { select: { id: true, nombre: true } },
      organizador: { select: { id: true, nombre: true, usuario: true } },
      cancha: { select: { techada: true } },
      repeticion: { select: { id: true, fecha: true } },
      participaciones: {
        include: { usuario: { select: { id: true, nombre: true, usuario: true, avatarUrl: true } } },
        orderBy: [{ ordenEspera: 'asc' }, { creadoEn: 'asc' }],
      },
    },
  });
  if (!partido) notFound();

  const voy = partido.participaciones.filter((p) => p.estado === 'VOY');
  const talvez = partido.participaciones.filter((p) => p.estado === 'TALVEZ');
  const espera = partido.participaciones.filter((p) => p.estado === 'ESPERA');
  const mia = partido.participaciones.find((p) => p.usuarioId === usuario.id);
  const pagaron = voy.filter((p) => p.pago).length;
  const organizo = partido.organizadorId === usuario.id || partido.coOrganizadorId === usuario.id;
  const yaPaso = partido.fecha < new Date();
  // Lista cerrada: el que no está adentro (ni tiene un lugar reservado) ya no se anota.
  const listaCerradaParaMi =
    partido.listaCerrada &&
    !organizo &&
    mia?.estado !== 'VOY' &&
    !(mia?.estado === 'ESPERA' && mia.invitacionExpiraEn && mia.invitacionExpiraEn > new Date());
  const cerrado = partido.estado === 'JUGADO' || partido.estado === 'CANCELADO';
  // Figura del partido: la votación abre al empezar y dura 72 h.
  const votacion = estadoVotacion(partido);
  const habilitados = votacion === 'NO_EMPEZO' ? [] : jugaron(partido.participaciones);
  // Lo que falta cargar no depende entre sí: se pide todo junto (en paralelo).
  const [votos, evento, desafio, turnoParaVincular, ubicacion, jugadas] = await Promise.all([
    habilitados.length >= 2
      ? prisma.votoFigura.findMany({ where: { partidoId: partido.id }, select: { votanteId: true, elegidoId: true } })
      : Promise.resolve([]),
    // Para agendarlo: quien va o lo organiza, si todavía no se jugó.
    !yaPaso && !cerrado && (organizo || mia?.estado === 'VOY' || mia?.estado === 'TALVEZ')
      ? eventoDe('partido', partido.id, usuario.id)
      : Promise.resolve(null),
    // Partido que salió de un desafío entre grupos.
    prisma.desafio.findFirst({
      where: { partidoId: partido.id },
      select: { retador: { select: { nombre: true } }, rival: { select: { nombre: true } } },
    }),
    // Turno confirmado del organizador, ese día y de ese deporte, listo para vincular.
    organizo && !partido.canchaId && !yaPaso && !cerrado
      ? prisma.reserva.findFirst({
          where: {
            usuarioId: usuario.id,
            estado: 'CONFIRMADA',
            partidoId: null,
            fecha: claveDia(partido.fecha),
            cancha: { deporteId: partido.deporteId },
          },
          include: { cancha: { select: { nombre: true } } },
          orderBy: { inicio: 'asc' },
        })
      : Promise.resolve(null),
    ubicacionDe(usuario),
    obtenerJugadas(usuario.id, { partidoId: partido.id }),
  ]);
  const recuento = contarVotos(votos);
  const cierreVotacion = new Date(partido.fecha.getTime() + HORAS_VOTACION * 3600_000);

  // Partido sin cancha publicada: turnos libres reales cerca de ese horario.
  const turnosSugeridos =
    organizo && !partido.canchaId && !yaPaso && !cerrado && !turnoParaVincular
      ? await turnosLibresParaPartido({
          deporteId: partido.deporteId,
          instante: partido.fecha,
          ciudad: partido.ciudad,
        })
      : [];

  const hora = partido.fecha.toLocaleTimeString('es-AR', {
    hour12: false, hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Argentina/Buenos_Aires',
  });

  return (
    <div className="flex min-h-[75dvh] flex-col gap-5">
      {desafio ? (
        <Link href="/desafios" className="tarjeta flex items-center justify-between gap-3 p-3" style={{ borderColor: 'var(--naranja-txt)' }}>
          <span className="text-sm font-semibold">
            <span className="t-rotulo mr-2 text-naranja-txt">Desafío</span>
            {desafio.retador.nombre} vs {desafio.rival?.nombre ?? '—'}
          </span>
          <span className="text-naranja-txt">→</span>
        </Link>
      ) : null}

      {partido.repeticion ? (
        <Link href={`/partidos/${partido.repeticion.id}`} className="tarjeta flex items-center justify-between gap-3 p-3">
          <span className="text-sm font-semibold">
            <span className="t-rotulo mr-2 text-verde-txt">Se repite</span>
            Ya está el del {DIAS[diaDeLaSemana(partido.repeticion.fecha)]} que viene
          </span>
          <span className="text-verde-txt">→</span>
        </Link>
      ) : null}

      <header className="flex flex-col gap-2">
        <p className="t-rotulo text-verde-txt">
          {partido.deporte.nombre}
          {partido.recurrenteSemanal ? ' · se repite' : ''}
          {partido.estado === 'CANCELADO' ? (
            <span style={{ color: 'var(--rojo)' }}> · cancelado</span>
          ) : partido.estado === 'JUGADO' ? (
            ' · jugado'
          ) : null}
        </p>
        <h1 className="t-display text-[30px]">
          {DIAS[diaDeLaSemana(partido.fecha)]} {hora}
        </h1>
        {partido.resultado ? (
          <p className="t-display text-[20px] tabular text-verde-txt">{partido.resultado}</p>
        ) : null}
        <p className="text-sm text-tinta-2">
          {partido.canchaId ? (
            <Link href={`/canchas/${partido.canchaId}`} className="font-semibold text-naranja-txt">
              {partido.lugarNombre}
            </Link>
          ) : (
            partido.lugarNombre
          )}
          {partido.direccion ? ` · ${partido.direccion}` : ''}
        </p>
        {/* Sin cancha publicada, la ubicación es el centro de la ciudad: para
            llegar manda la dirección escrita y la distancia va aproximada. */}
        <ComoLlegar
          lugar={{
            ...partido,
            direccion: partido.direccion ?? partido.lugarNombre,
            latitud: partido.canchaId ? partido.latitud : null,
            longitud: partido.canchaId ? partido.longitud : null,
          }}
          km={kmHasta(ubicacion, partido)}
          aproximada={!partido.canchaId}
        />
        {!cerrado && partido.latitud != null && partido.longitud != null && hayPronostico(partido.fecha, partido.duracionMin) ? (
          <PronosticoPartido
            latitud={partido.latitud}
            longitud={partido.longitud}
            inicio={partido.fecha.toISOString()}
            minutos={partido.duracionMin}
            techada={partido.cancha?.techada ?? false}
          />
        ) : null}
        {partido.lugarTelefono ? (
          <a
            href={`tel:${partido.lugarTelefono.replace(/[^+0-9]/g, '')}`}
            className="text-[13px] font-semibold text-verde-txt"
          >
            Cancha: {partido.lugarTelefono}
          </a>
        ) : null}
        <p className="text-[13px] text-tinta-3">
          Organiza {partido.organizador.nombre} (@{partido.organizador.usuario})
          {partido.grupo ? (
            <>
              {' · '}
              <Link href={`/grupos/${partido.grupo.id}`} className="font-semibold text-verde-txt">
                {partido.grupo.nombre}
              </Link>
            </>
          ) : null}
        </p>
        {evento ? <AgregarCalendario ics={`/api/calendario/partido/${partido.id}`} google={enlaceGoogle(evento)} /> : null}
      </header>

      {partido.nivel ? (
        <p className="text-sm text-tinta-2">
          <span className="t-rotulo text-naranja-txt">Nivel sugerido</span>{' '}
          <span className="font-semibold text-tinta">{ROTULOS_NIVEL[partido.nivel]}</span>
        </p>
      ) : null}

      <section className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between">
          <span className="t-rotulo tabular">
            {voy.length}/{partido.cupo} confirmados
            {partido.listaCerrada ? <span className="ml-2 text-naranja-txt">· lista cerrada</span> : null}
          </span>
          <span className="t-rotulo tabular">
            mínimo {partido.minimo} {voy.length >= partido.minimo ? '✓' : ''}
          </span>
        </div>
        <div className="barra-progreso">
          <i style={{ width: `${Math.min(100, (voy.length / partido.cupo) * 100)}%` }} />
        </div>
      </section>

      {turnoParaVincular ? (
        <section className="tarjeta flex flex-col gap-2 p-4" style={{ borderColor: 'var(--verde-txt)' }}>
          <p className="text-sm">
            Tenés un turno confirmado ese día en <strong>{turnoParaVincular.cancha.nombre}</strong> a las{' '}
            {turnoParaVincular.hora}.
          </p>
          <VincularTurno partidoId={partido.id} reservaId={turnoParaVincular.id} />
          <p className="text-xs text-tinta-3">
            El partido toma ese lugar y horario y les avisamos a los anotados.
          </p>
        </section>
      ) : null}

      {turnosSugeridos.length > 0 ? (
        <section className="tarjeta flex flex-col gap-2 p-4" style={{ borderColor: 'var(--verde-txt)' }}>
          <p className="t-rotulo text-verde-txt">¿Todavía no tienen cancha? Hay turnos libres</p>
          {turnosSugeridos.map((turno) => (
            <Link
              key={turno.canchaId}
              href={`/canchas/${turno.canchaId}?fecha=${turno.fecha}&hora=${turno.hora}`}
              className="flex items-center justify-between gap-3 border-b border-borde py-2 last:border-b-0"
            >
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold">{turno.canchaNombre}</span>
                <span className="block truncate text-xs text-tinta-3">
                  {turno.direccion}
                  {turno.ciudad ? ` · ${turno.ciudad}` : ''}
                </span>
              </span>
              <span className="shrink-0 text-right text-xs font-semibold tabular text-verde-txt">
                {turno.hora}
                {turno.precio != null ? <span className="block text-tinta-3">{formatearPlata(turno.precio)}</span> : null}
              </span>
            </Link>
          ))}
          <p className="text-xs text-tinta-3">
            Disponibilidad real en este momento. Reservalo y, cuando el complejo lo confirme,
            vinculalo acá con un toque.
          </p>
        </section>
      ) : null}

      {partido.costoPorJugador && organizo && partido.estado !== 'CANCELADO' && voy.length > 0 ? (
        <Pagos
          partidoId={partido.id}
          costo={partido.costoPorJugador}
          titulo={`${partido.deporte.nombre} del ${DIAS[diaDeLaSemana(partido.fecha)]}`}
          jugadores={voy.map((p) => ({
            usuarioId: p.usuarioId,
            nombre: p.usuario.nombre,
            avatarUrl: p.usuario.avatarUrl,
            pago: p.pago,
          }))}
        />
      ) : partido.costoPorJugador ? (
        <section className="tarjeta flex items-center justify-between gap-3 p-4">
          <div>
            <p className="text-sm font-semibold tabular">
              {formatearPlata(partido.costoPorJugador)} por jugador
            </p>
            <p className="text-xs text-tinta-3">
              Pagaron {pagaron} de {voy.length} · se arregla con @{partido.organizador.usuario}
            </p>
          </div>
          {mia?.estado === 'VOY' ? (
            <span
              className="shrink-0 rounded-[6px] border px-2.5 py-1 text-xs font-semibold"
              style={
                mia.pago
                  ? { borderColor: 'var(--verde-txt)', color: 'var(--verde-txt)' }
                  : { borderColor: 'var(--borde-2)', color: 'var(--tinta-3)' }
              }
            >
              {mia.pago ? 'Ya pagaste' : 'Te falta pagar'}
            </span>
          ) : null}
        </section>
      ) : null}

      {organizo && yaPaso && !cerrado && voy.length > 0 ? (
        <PasarLista
          partidoId={partido.id}
          jugadores={voy.map((p) => ({ usuarioId: p.usuarioId, nombre: p.usuario.nombre }))}
        />
      ) : null}

      <section className="flex flex-col gap-4">
        <ListaDeGente
          titulo={partido.estado === 'JUGADO' ? `Jugaron · ${voy.filter((p) => p.asistio).length}` : `Confirmados · ${voy.length}`}
          color="var(--verde-txt)"
          filas={voy.map((p) => ({
            id: p.id,
            nombre: p.usuario.nombre,
            avatarUrl: p.usuario.avatarUrl,
            href: p.usuarioId === usuario.id ? undefined : `/jugadores/${p.usuario.usuario}`,
            detalle:
              partido.estado === 'JUGADO'
                ? p.asistio === false
                  ? 'no fue'
                  : 'jugó'
                : p.usuarioId === partido.organizadorId
                  ? 'organiza'
                  : p.usuarioId === partido.coOrganizadorId
                    ? 'co-organiza'
                    : `@${p.usuario.usuario}`,
            apagado: partido.estado === 'JUGADO' && p.asistio === false,
          }))}
        />
        {talvez.length > 0 ? (
          <ListaDeGente titulo={`Tal vez · ${talvez.length}`} color="var(--naranja-txt)" filas={talvez.map((p) => ({
            id: p.id,
            nombre: p.usuario.nombre,
            avatarUrl: p.usuario.avatarUrl,
            href: p.usuarioId === usuario.id ? undefined : `/jugadores/${p.usuario.usuario}`,
            detalle: `@${p.usuario.usuario}`,
          }))} />
        ) : null}
        {espera.length > 0 ? (
          <ListaDeGente titulo={`En espera · ${espera.length}`} color="var(--azul-txt)" filas={espera.map((p, indice) => ({
            id: p.id,
            nombre: p.usuario.nombre,
            avatarUrl: p.usuario.avatarUrl,
            href: p.usuarioId === usuario.id ? undefined : `/jugadores/${p.usuario.usuario}`,
            detalle: `${indice + 1}º en la lista`,
          }))} />
        ) : null}
      </section>

      {votacion !== 'NO_EMPEZO' && habilitados.length >= 2 ? (
        <FiguraDelPartido
          partidoId={partido.id}
          estado={votacion}
          candidatos={habilitados
            .filter((p) => p.usuarioId !== usuario.id)
            .map((p) => ({ usuarioId: p.usuarioId, nombre: p.usuario.nombre }))}
          miVoto={votos.find((v) => v.votanteId === usuario.id)?.elegidoId ?? null}
          puedoVotar={habilitados.some((p) => p.usuarioId === usuario.id)}
          votaron={votos.length}
          habilitados={habilitados.length}
          ganadores={recuento.ganadores.map((id) => ({
            nombre: habilitados.find((p) => p.usuarioId === id)?.usuario.nombre ?? 'Jugador',
            votos: recuento.maximo,
          }))}
          cierra={`Cierra el ${cierreVotacion.toLocaleDateString('es-AR', {
            weekday: 'long',
            timeZone: 'America/Argentina/Buenos_Aires',
          })} a las ${cierreVotacion.toLocaleTimeString('es-AR', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
            timeZone: 'America/Argentina/Buenos_Aires',
          })}`}
        />
      ) : null}

      {!cerrado && voy.length >= 2 ? (
        <Equipos
          partidoId={partido.id}
          organiza={organizo}
          rutaPublica={`/p/${partido.tokenPublico}`}
          cuando={`${DIAS[diaDeLaSemana(partido.fecha)]} ${hora}`}
          jugadores={voy.map((p) => ({ usuarioId: p.usuarioId, nombre: p.usuario.nombre, equipo: p.equipo }))}
        />
      ) : null}

      {partido.organizadorId === usuario.id && !cerrado ? (
        <ElegirCoorganizador
          partidoId={partido.id}
          actualId={partido.coOrganizadorId}
          candidatos={voy
            .filter((p) => p.usuarioId !== usuario.id)
            .map((p) => ({ usuarioId: p.usuarioId, nombre: p.usuario.nombre }))}
        />
      ) : null}

      {partido.estado === 'JUGADO' ? (
        <section className="flex flex-col gap-3">
          <p className="t-rotulo">Jugadas del partido</p>
          {mia || organizo ? (
            <PublicarJugada
              partidoId={partido.id}
              invitacion={`Subí la jugada del ${DIAS[diaDeLaSemana(partido.fecha)]}`}
            />
          ) : null}
          {jugadas.map((jugada) => (
            <TarjetaJugada key={jugada.id} jugada={jugada} />
          ))}
        </section>
      ) : null}

      <section>
        <p className="t-rotulo mb-2">Charla del partido</p>
        {mia || partido.organizadorId === usuario.id ? (
          <Chat partidoId={partido.id} />
        ) : (
          <p className="tarjeta p-4 text-sm text-tinta-3">
            El chat es de los que participan: respondé Voy, Tal vez o No voy y entrás.
          </p>
        )}
      </section>

      {!organizo ? (
        <div className="border-t border-borde pt-3">
          <Moderacion partidoId={partido.id} />
        </div>
      ) : null}

      <div className="mt-auto flex flex-col gap-3 pt-2">
        {!cerrado && !yaPaso ? (
          <>
            <CompartirPartido rutaPublica={`/p/${partido.tokenPublico}`} />
            {organizo ? (
              <>
                <CerrarLista partidoId={partido.id} cerrada={partido.listaCerrada} />
                <Link href={`/partidos/${partido.id}/editar`} className="btn btn-secundario">
                  Editar el partido
                </Link>
              </>
            ) : null}
            {listaCerradaParaMi ? (
              <p className="aviso-ok border-borde-2 text-tinta-2">
                La lista está cerrada: el organizador ya no está sumando gente.
              </p>
            ) : (
              <BotoneraRsvp
                partidoId={partido.id}
                estadoActual={mia?.estado ?? null}
                invitacionHasta={mia?.invitacionExpiraEn?.toISOString() ?? null}
              />
            )}
            {organizo ? <CancelarPartido partidoId={partido.id} /> : null}
          </>
        ) : null}
      </div>

      {!cerrado && !yaPaso && !partido.listaCerrada && (!mia || mia.estado === 'TALVEZ') ? (
        <BarraVoy partidoId={partido.id} faltan={Math.max(0, partido.cupo - voy.length)} />
      ) : null}
    </div>
  );
}

function ListaDeGente({
  titulo,
  color,
  filas,
}: {
  titulo: string;
  color: string;
  filas: {
    id: string;
    nombre: string;
    avatarUrl?: string | null;
    detalle: string;
    apagado?: boolean;
    href?: string;
  }[];
}) {
  return (
    <div>
      <p className="t-rotulo mb-1">{titulo}</p>
      <div>
        {filas.map((fila) => {
          const contenido = (
            <>
              <span
                className="h-2 w-2 flex-shrink-0 rounded-full"
                style={{ background: fila.apagado ? 'var(--gris-estado)' : color }}
              />
              <Avatar nombre={fila.nombre} avatarUrl={fila.avatarUrl} tam={28} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{fila.nombre}</p>
              </div>
              <span className="text-xs text-tinta-3">{fila.detalle}</span>
            </>
          );
          const clase = 'flex items-center gap-3 border-b border-borde py-2.5 last:border-b-0';
          const estilo = fila.apagado ? { opacity: 0.5 } : undefined;
          return fila.href ? (
            <Link key={fila.id} href={fila.href} className={clase} style={estilo}>
              {contenido}
            </Link>
          ) : (
            <div key={fila.id} className={clase} style={estilo}>
              {contenido}
            </div>
          );
        })}
      </div>
    </div>
  );
}
