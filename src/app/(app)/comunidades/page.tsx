import Link from 'next/link';
import { prisma } from '@/lib/db';

export const metadata = { title: 'Comunidades' };
export const dynamic = 'force-dynamic';

export default async function Comunidades() {
  const [deportes, jugadoresPor, partidosPor] = await Promise.all([
    prisma.deporte.findMany({ orderBy: { orden: 'asc' } }),
    prisma.usuarioDeporte.groupBy({ by: ['deporteId'], _count: { _all: true } }),
    prisma.partido.groupBy({
      by: ['deporteId'],
      where: { visibilidad: 'ABIERTO', estado: { in: ['ARMANDOSE', 'CONFIRMADO'] }, fecha: { gte: new Date() } },
      _count: { _all: true },
    }),
  ]);

  const jugadores = new Map(jugadoresPor.map((fila) => [fila.deporteId, fila._count._all]));
  const partidos = new Map(partidosPor.map((fila) => [fila.deporteId, fila._count._all]));

  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="t-pantalla">Comunidades</h1>
        <p className="mt-1 text-sm text-tinta-2">
          Cada deporte tiene su casa: partidos abiertos, grupos y ranking en un solo lugar.
        </p>
      </header>

      <div className="flex flex-col gap-2">
        {deportes.map((deporte) => (
          <Link
            key={deporte.id}
            href={`/comunidades/${deporte.slug}`}
            className="tarjeta flex items-center justify-between gap-3 p-4"
          >
            <div>
              <p className="t-display text-[17px]">{deporte.nombre}</p>
              <p className="t-rotulo mt-0.5 tabular">
                {jugadores.get(deporte.id) ?? 0} jugadores · {partidos.get(deporte.id) ?? 0} partidos abiertos
              </p>
            </div>
            <span className="t-display text-[16px] text-verde-txt">→</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
