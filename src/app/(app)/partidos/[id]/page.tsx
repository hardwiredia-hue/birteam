import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { usuarioActual } from '@/lib/auth';
import { formatearPlata } from '@/lib/formato';
import { Chat } from '@/components/chat';
import { Moderacion } from '@/components/moderacion';
import { PublicarJugada, TarjetaJugada } from '@/components/jugadas';
import { obtenerJugadas } from '@/lib/jugadas';
import { Avatar } from '@/components/avatar';
import {
  BotoneraRsvp,
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
  const cerrado = partido.estado === 'JUGADO' || partido.estado === 'CANCELADO';

  const hora = partido.fecha.toLocaleTimeString('es-AR', {
    hour12: false, hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Argentina/Buenos_Aires',
  });

  return (
    <div className="flex min-h-[75dvh] flex-col gap-5">
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
          {DIAS[partido.fecha.getDay()]} {hora}
        </h1>
        {partido.resultado ? (
          <p className="t-display text-[20px] tabular text-verde-txt">{partido.resultado}</p>
        ) : null}
        <p className="text-sm text-tinta-2">
          {partido.lugarNombre}
          {partido.direccion ? ` · ${partido.direccion}` : ''}
        </p>
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
      </header>

      <section className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between">
          <span className="t-rotulo tabular">
            {voy.length}/{partido.cupo} confirmados
          </span>
          <span className="t-rotulo tabular">
            mínimo {partido.minimo} {voy.length >= partido.minimo ? '✓' : ''}
          </span>
        </div>
        <div className="barra-progreso">
          <i style={{ width: `${Math.min(100, (voy.length / partido.cupo) * 100)}%` }} />
        </div>
      </section>

      {partido.costoPorJugador ? (
        <section className="tarjeta flex items-center justify-between p-4">
          <div>
            <p className="text-sm font-semibold tabular">
              {formatearPlata(partido.costoPorJugador)} por jugador
            </p>
            <p className="text-xs text-tinta-3">
              Pagaron {pagaron} de {voy.length} · se arregla con @{partido.organizador.usuario}
            </p>
          </div>
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
              invitacion={`Subí la jugada del ${DIAS[partido.fecha.getDay()]}`}
            />
          ) : null}
          {(await obtenerJugadas(usuario.id, { partidoId: partido.id })).map((jugada) => (
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
              <Link href={`/partidos/${partido.id}/editar`} className="btn btn-secundario">
                Editar el partido
              </Link>
            ) : null}
            <BotoneraRsvp
              partidoId={partido.id}
              estadoActual={mia?.estado ?? null}
              invitacionHasta={mia?.invitacionExpiraEn?.toISOString() ?? null}
            />
            {organizo ? <CancelarPartido partidoId={partido.id} /> : null}
          </>
        ) : null}
      </div>
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
