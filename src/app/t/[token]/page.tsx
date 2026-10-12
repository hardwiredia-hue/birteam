import Link from 'next/link';
import { LogoEquipo } from '@/components/logo-equipo';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { usuarioActual } from '@/lib/auth';
import { sitioEnConstruccion } from '@/lib/sitio';
import { PaginaConstruccion } from '@/components/construccion';
import { avanzarCopa, calcularTabla } from '@/lib/torneos';
import { Logotipo } from '@/components/marca';

export const metadata = { title: 'Te invitaron a un torneo' };
export const dynamic = 'force-dynamic';

/** El link público del torneo: se abre sin cuenta, para convocar equipos. */
export default async function TorneoPublico({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const usuarioDeGuardia = await usuarioActual();
  if ((await sitioEnConstruccion()) && usuarioDeGuardia?.rol !== 'ADMIN') {
    return <PaginaConstruccion />;
  }


  const torneo = await prisma.torneo.findUnique({
    where: { tokenPublico: token },
    include: {
      deporte: true,
      organizador: { select: { nombre: true } },
      equipos: true,
      partidos: true,
    },
  });
  if (!torneo) notFound();

  const usuario = await usuarioActual();
  const volver = `/torneos/${torneo.id}`;
  const lugares = Math.max(0, torneo.maxEquipos - torneo.equipos.length);
  const tabla = calcularTabla(torneo.equipos, torneo.partidos);
  // Liga: el primero de la tabla. Copa: solo hay "puntero" cuando sale el campeón.
  const campeonCopa =
    torneo.formato === 'COPA' && torneo.cuadro
      ? torneo.equipos.find((e) => e.id === avanzarCopa(JSON.parse(torneo.cuadro!), torneo.partidos).campeonId)
      : null;
  const puntero = torneo.formato === 'COPA' ? (campeonCopa ?? null) : torneo.estado !== 'INSCRIPCION' ? tabla[0] : null;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 py-10">
      <Logotipo ancho={100} />

      <div className="flex flex-1 flex-col justify-center gap-5 py-8">
        <p className="t-rotulo text-verde-txt">
          {torneo.estado === 'INSCRIPCION' ? 'Te invitaron a un torneo' : 'Torneo en birteam'}
        </p>

        <div className="tarjeta flex flex-col gap-3 p-5">
          <p className="t-rotulo text-verde-txt">
            {torneo.deporte.nombre} · {torneo.formato === 'COPA' ? 'copa' : 'liga'}
          </p>
          <p className="t-display text-[28px]">{torneo.nombre}</p>
          {torneo.descripcion ? <p className="text-sm text-tinta-2">{torneo.descripcion}</p> : null}
          <p className="text-xs text-tinta-3">
            Organiza {torneo.organizador.nombre}
            {torneo.ciudad ? ` · ${torneo.ciudad}` : ''}
          </p>
          <div className="flex items-baseline justify-between">
            <span className="t-rotulo tabular">
              {torneo.equipos.length}/{torneo.maxEquipos} equipos
            </span>
            <span
              className="t-rotulo tabular"
              style={
                torneo.estado === 'INSCRIPCION' && lugares > 0
                  ? { color: 'var(--verde-txt)' }
                  : undefined
              }
            >
              {torneo.estado === 'INSCRIPCION'
                ? lugares > 0
                  ? `quedan ${lugares} lugares`
                  : 'cupo completo'
                : torneo.estado === 'EN_JUEGO'
                  ? puntero
                    ? `puntero: ${puntero.nombre}`
                    : 'en juego'
                  : puntero
                    ? `campeón: ${puntero.nombre}`
                    : 'terminado'}
            </span>
          </div>
          {torneo.equipos.length > 0 ? (
            <div className="flex flex-col gap-2 border-t border-borde pt-3">
              {torneo.equipos.slice(0, 12).map((equipo) => (
                <div key={equipo.id} className="flex items-center gap-2.5">
                  <LogoEquipo nombre={equipo.nombre} url={equipo.logoUrl} tam={28} />
                  <span className="truncate text-sm font-semibold">{equipo.nombre}</span>
                </div>
              ))}
              {torneo.equipos.length > 12 ? (
                <p className="text-xs text-tinta-3">y {torneo.equipos.length - 12} más</p>
              ) : null}
            </div>
          ) : null}
        </div>

        {usuario ? (
          <Link href={volver} className="btn btn-primario">
            {torneo.estado === 'INSCRIPCION' ? 'Abrir el torneo y anotar mi equipo' : 'Ver el torneo completo'}
          </Link>
        ) : (
          <>
            <Link href={`/registro?volver=${encodeURIComponent(volver)}`} className="btn btn-primario">
              Sumate en 30 segundos
            </Link>
            <p className="text-center text-sm text-tinta-2">
              ¿Ya tenés cuenta?{' '}
              <Link href={`/entrar?volver=${encodeURIComponent(volver)}`} className="font-semibold text-verde-txt">
                Entrá
              </Link>
            </p>
          </>
        )}
      </div>

      <p className="t-rotulo text-center">birteam · ¿Querés jugar? Encontrá con quién.</p>
    </main>
  );
}
