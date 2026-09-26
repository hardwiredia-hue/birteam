import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { usuarioActual } from '@/lib/auth';
import { calcularRanking } from '@/lib/estadisticas';
import { distanciaKm, formatearDistancia } from '@/lib/geo';
import { formatearPlata } from '@/lib/formato';
import { Avatar } from '@/components/avatar';
import { BotonSumarme } from '@/components/sumarse-grupo';

export const metadata = { title: 'Comunidad' };
export const dynamic = 'force-dynamic';

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

/** La casa de un deporte: partidos abiertos cerca, grupos, ranking y el
 *  botón de armar partido con el deporte ya elegido (ESQUEMA.md fase 2). */
export default async function Comunidad({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const usuario = (await usuarioActual())!;

  const deporte = await prisma.deporte.findUnique({ where: { slug } });
  if (!deporte) notFound();

  const [partidos, grupos, jugadoresTotal, ranking] = await Promise.all([
    prisma.partido.findMany({
      where: {
        deporteId: deporte.id,
        visibilidad: 'ABIERTO',
        estado: { in: ['ARMANDOSE', 'CONFIRMADO'] },
        fecha: { gte: new Date() },
      },
      include: { participaciones: { where: { estado: 'VOY' }, select: { id: true } } },
      orderBy: { fecha: 'asc' },
      take: 30,
    }),
    prisma.grupo.findMany({
      where: { deporteId: deporte.id, abierto: true, miembros: { none: { usuarioId: usuario.id } } },
      include: { _count: { select: { miembros: true } } },
      orderBy: { creadoEn: 'desc' },
      take: 5,
    }),
    prisma.usuarioDeporte.count({ where: { deporteId: deporte.id } }),
    calcularRanking(usuario.id, { deporteSlug: slug, soloCiudad: usuario.ciudad }),
  ]);

  // Si en tu ciudad no hay ranking todavía, se abre al país.
  const podio =
    ranking.filas.length > 0
      ? ranking
      : await calcularRanking(usuario.id, { deporteSlug: slug, soloCiudad: null });

  const cercanos = partidos
    .map((partido) => ({
      ...partido,
      km:
        usuario.latitud != null && usuario.longitud != null && partido.latitud != null && partido.longitud != null
          ? distanciaKm(usuario.latitud, usuario.longitud, partido.latitud, partido.longitud)
          : null,
    }))
    .sort((a, b) => (a.km ?? Infinity) - (b.km ?? Infinity) || a.fecha.getTime() - b.fecha.getTime())
    .slice(0, 5);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1.5">
        <Link href="/comunidades" className="t-rotulo">← Todas las comunidades</Link>
        <h1 className="t-display text-[28px]">{deporte.nombre}</h1>
        <p className="t-rotulo tabular">
          {jugadoresTotal} jugadores en birteam
          {usuario.ciudad ? ` · tu zona: ${usuario.ciudad}` : ''}
        </p>
      </header>

      <Link href={`/crear?deporte=${deporte.slug}`} className="btn btn-primario">
        Armar partido de {deporte.nombre}
      </Link>

      <section>
        <div className="mb-2 flex items-baseline justify-between">
          <p className="t-rotulo">Partidos abiertos</p>
          <Link href={`/explorar?deporte=${deporte.slug}`} className="text-xs font-semibold text-verde-txt">
            Ver todos
          </Link>
        </div>
        {cercanos.length === 0 ? (
          <p className="tarjeta p-4 text-sm text-tinta-2">
            Nada abierto por ahora. Armá el primero y va a aparecer acá para toda la comunidad.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {cercanos.map((partido) => {
              const voy = partido.participaciones.length;
              const faltan = partido.cupo - voy;
              const hora = partido.fecha.toLocaleTimeString('es-AR', {
                hour12: false,
                hour: '2-digit',
                minute: '2-digit',
                timeZone: 'America/Argentina/Buenos_Aires',
              });
              return (
                <Link key={partido.id} href={`/partidos/${partido.id}`} className="tarjeta flex items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <p className="t-display text-[16px]">
                      {DIAS[partido.fecha.getDay()]} {hora}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-tinta-3">
                      {partido.lugarNombre}
                      {partido.km != null ? ` · a ${formatearDistancia(partido.km)}` : ''}
                      {partido.costoPorJugador ? ` · ${formatearPlata(partido.costoPorJugador)}` : ''}
                    </p>
                  </div>
                  <span
                    className="flex-shrink-0 text-xs font-semibold"
                    style={{ color: faltan > 0 ? 'var(--verde-txt)' : 'var(--azul-txt)' }}
                  >
                    {faltan > 0 ? `Faltan ${faltan}` : 'Completo'}
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {grupos.length > 0 ? (
        <section>
          <p className="t-rotulo mb-2">Grupos para sumarte</p>
          <div className="flex flex-col gap-2">
            {grupos.map((grupo) => (
              <div key={grupo.id} className="tarjeta flex items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{grupo.nombre}</p>
                  <p className="t-rotulo mt-0.5">
                    {grupo._count.miembros} {grupo._count.miembros === 1 ? 'miembro' : 'miembros'}
                    {grupo.ciudad ? ` · ${grupo.ciudad}` : ''}
                  </p>
                </div>
                <BotonSumarme grupoId={grupo.id} />
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {podio.filas.length > 0 ? (
        <section>
          <div className="mb-2 flex items-baseline justify-between">
            <p className="t-rotulo">
              Ranking {ranking.filas.length > 0 && usuario.ciudad ? `· ${usuario.ciudad}` : '· todo el país'}
            </p>
            <Link
              href={`/explorar?tab=ranking&deporte=${deporte.slug}`}
              className="text-xs font-semibold text-verde-txt"
            >
              Completo
            </Link>
          </div>
          <div>
            {podio.filas.slice(0, 5).map((fila) => (
              <Link
                key={fila.usuario.id}
                href={fila.usuario.id === usuario.id ? '/perfil' : `/jugadores/${fila.usuario.usuario}`}
                className="flex items-center gap-3 border-b border-borde py-2.5 last:border-b-0"
              >
                <span
                  className="t-display w-7 text-center text-[15px] tabular"
                  style={{ color: fila.posicion <= 3 ? 'var(--verde-txt)' : 'var(--tinta-3)' }}
                >
                  {fila.posicion}
                </span>
                <Avatar nombre={fila.usuario.nombre} avatarUrl={fila.usuario.avatarUrl} tam={28} />
                <p className="min-w-0 flex-1 truncate text-sm font-semibold">{fila.usuario.nombre}</p>
                <span className="t-display text-[15px] text-verde-txt tabular">{fila.puntos} pts</span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
