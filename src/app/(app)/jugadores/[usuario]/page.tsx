import { notFound, redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { usuarioActual } from '@/lib/auth';
import { Moderacion } from '@/components/moderacion';

export const metadata = { title: 'Jugador' };
export const dynamic = 'force-dynamic';

/** El perfil ajeno: lo que mirás antes de aceptar a un desconocido. */
export default async function PerfilAjeno({ params }: { params: Promise<{ usuario: string }> }) {
  const { usuario: alias } = await params;
  const yo = (await usuarioActual())!;

  const jugador = await prisma.usuario.findUnique({
    where: { usuario: alias.toLowerCase() },
    include: { deportes: { include: { deporte: true }, orderBy: { principal: 'desc' } } },
  });
  if (!jugador) notFound();
  if (jugador.id === yo.id) redirect('/perfil');

  const [conRegistro, grupos, historial, bloqueo] = await Promise.all([
    prisma.participacion.findMany({
      where: { usuarioId: jugador.id, asistio: { not: null } },
      select: { asistio: true },
    }),
    prisma.miembroGrupo.count({ where: { usuarioId: jugador.id } }),
    prisma.participacion.findMany({
      where: { usuarioId: jugador.id, partido: { estado: 'JUGADO' } },
      include: { partido: { include: { deporte: true } } },
      orderBy: { partido: { fecha: 'desc' } },
      take: 4,
    }),
    prisma.bloqueo.findUnique({
      where: { bloqueadorId_bloqueadoId: { bloqueadorId: yo.id, bloqueadoId: jugador.id } },
    }),
  ]);

  const jugados = conRegistro.filter((p) => p.asistio).length;
  const asistencia =
    conRegistro.length > 0 ? Math.round((jugados / conRegistro.length) * 100) : null;
  const iniciales = jugador.nombre
    .split(' ')
    .map((parte) => parte[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center gap-4">
        <span className="avatar h-[64px] w-[64px] text-lg">{iniciales}</span>
        <div>
          <h1 className="t-display text-[20px]">{jugador.nombre}</h1>
          <p className="t-rotulo mt-1">
            @{jugador.usuario}
            {jugador.ciudad ? ` · ${jugador.ciudad}` : ''}
          </p>
        </div>
      </header>

      <section className="grid grid-cols-3 gap-2">
        <div className="tarjeta px-2 py-3 text-center">
          <p className="t-display text-[22px] text-verde-txt tabular">
            {asistencia === null ? '—' : `${asistencia}%`}
          </p>
          <p className="t-rotulo mt-1 text-[9.5px]">Asistencia</p>
        </div>
        <div className="tarjeta px-2 py-3 text-center">
          <p className="t-display text-[22px] tabular">{jugados}</p>
          <p className="t-rotulo mt-1 text-[9.5px]">Jugados</p>
        </div>
        <div className="tarjeta px-2 py-3 text-center">
          <p className="t-display text-[22px] tabular">{grupos}</p>
          <p className="t-rotulo mt-1 text-[9.5px]">Grupos</p>
        </div>
      </section>

      {jugador.bio ? <p className="text-sm text-tinta-2">{jugador.bio}</p> : null}

      {jugador.deportes.length > 0 ? (
        <section>
          <p className="t-rotulo mb-2">Deportes</p>
          <div className="flex flex-wrap gap-2">
            {jugador.deportes.map((relacion) => (
              <span
                key={relacion.deporteId}
                className={relacion.principal ? 'chip-sel chip-sel-activo' : 'chip-sel'}
              >
                {relacion.deporte.nombre}
              </span>
            ))}
          </div>
        </section>
      ) : null}

      {historial.length > 0 ? (
        <section>
          <p className="t-rotulo mb-1">Últimos partidos</p>
          <div>
            {historial.map((participacion) => (
              <div key={participacion.id} className="flex items-center gap-3 border-b border-borde py-2.5 last:border-b-0">
                <span
                  className="h-2 w-2 flex-shrink-0 rounded-full"
                  style={{ background: participacion.asistio ? 'var(--verde-txt)' : 'var(--gris-estado)' }}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">
                    {participacion.partido.deporte.nombre} · {participacion.partido.lugarNombre}
                  </p>
                </div>
                <span
                  className="text-xs font-semibold"
                  style={{ color: participacion.asistio ? 'var(--verde-txt)' : 'var(--tinta-3)' }}
                >
                  {participacion.asistio === null ? '—' : participacion.asistio ? 'Jugó' : 'No fue'}
                </span>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <footer className="mt-2 border-t border-borde pt-4">
        <Moderacion denunciadoId={jugador.id} bloqueado={Boolean(bloqueo)} />
      </footer>
    </div>
  );
}
