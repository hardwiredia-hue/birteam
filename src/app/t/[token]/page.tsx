import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { usuarioActual } from '@/lib/auth';
import { calcularTabla } from '@/lib/torneos';
import { Logotipo } from '@/components/marca';

export const metadata = { title: 'Te invitaron a un torneo' };
export const dynamic = 'force-dynamic';

/** El link público del torneo: se abre sin cuenta, para convocar equipos. */
export default async function TorneoPublico({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

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
  const puntero = torneo.estado !== 'INSCRIPCION' ? tabla[0] : null;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 py-10">
      <Logotipo ancho={100} />

      <div className="flex flex-1 flex-col justify-center gap-5 py-8">
        <p className="t-rotulo text-verde-txt">
          {torneo.estado === 'INSCRIPCION' ? 'Te invitaron a un torneo' : 'Torneo en birteam'}
        </p>

        <div className="tarjeta flex flex-col gap-3 p-5">
          <p className="t-rotulo text-verde-txt">{torneo.deporte.nombre}</p>
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
