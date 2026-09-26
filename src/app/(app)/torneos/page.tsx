import Link from 'next/link';
import { prisma } from '@/lib/db';
import { usuarioActual } from '@/lib/auth';

export const metadata = { title: 'Torneos' };
export const dynamic = 'force-dynamic';

const ROTULO_ESTADO: Record<string, { texto: string; color: string }> = {
  INSCRIPCION: { texto: 'Inscripción abierta', color: 'var(--verde-txt)' },
  EN_JUEGO: { texto: 'En juego', color: 'var(--naranja-txt)' },
  TERMINADO: { texto: 'Terminado', color: 'var(--tinta-3)' },
};

export default async function Torneos() {
  const usuario = (await usuarioActual())!;

  const torneos = await prisma.torneo.findMany({
    where: {
      OR: [
        { estado: { in: ['INSCRIPCION', 'EN_JUEGO'] } },
        { organizadorId: usuario.id },
        { equipos: { some: { capitanId: usuario.id } } },
      ],
    },
    include: { deporte: true, _count: { select: { equipos: true } } },
    orderBy: { creadoEn: 'desc' },
    take: 40,
  });

  // Primero los míos, después los de mi ciudad.
  const ordenados = torneos.sort((a, b) => {
    const aMio = a.organizadorId === usuario.id ? 0 : 1;
    const bMio = b.organizadorId === usuario.id ? 0 : 1;
    if (aMio !== bMio) return aMio - bMio;
    const aCerca = usuario.ciudad && a.ciudad === usuario.ciudad ? 0 : 1;
    const bCerca = usuario.ciudad && b.ciudad === usuario.ciudad ? 0 : 1;
    return aCerca - bCerca;
  });

  return (
    <div className="flex flex-col gap-4">
      <header className="flex items-center justify-between">
        <h1 className="t-pantalla">Torneos</h1>
        <Link href="/torneos/nuevo" className="btn btn-primario btn-sm">Crear torneo</Link>
      </header>

      {ordenados.length === 0 ? (
        <div className="tarjeta flex flex-col gap-4 p-5">
          <p className="text-sm text-tinta-2">
            Armá el primer torneo: los equipos se anotan solos, el fixture se genera con un botón
            y la tabla de posiciones se lleva sola.
          </p>
          <Link href="/torneos/nuevo" className="btn btn-primario">Crear el torneo</Link>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {ordenados.map((torneo) => {
            const estado = ROTULO_ESTADO[torneo.estado] ?? ROTULO_ESTADO.TERMINADO;
            return (
              <Link key={torneo.id} href={`/torneos/${torneo.id}`} className="tarjeta flex flex-col gap-1.5 p-4">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="t-rotulo text-verde-txt">{torneo.deporte.nombre}</span>
                  <span className="text-xs font-semibold" style={{ color: estado.color }}>
                    {estado.texto}
                  </span>
                </div>
                <p className="t-display text-[18px]">{torneo.nombre}</p>
                <p className="t-rotulo tabular">
                  {torneo._count.equipos}/{torneo.maxEquipos} equipos
                  {torneo.ciudad ? ` · ${torneo.ciudad}` : ''}
                  {torneo.organizadorId === usuario.id ? ' · organizás vos' : ''}
                </p>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
