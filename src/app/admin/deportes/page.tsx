import { prisma } from '@/lib/db';
import { AltaDeporte } from './acciones';

export const metadata = { title: 'Deportes' };
export const dynamic = 'force-dynamic';

export default async function Deportes() {
  const deportes = await prisma.deporte.findMany({
    orderBy: { orden: 'asc' },
    include: { _count: { select: { usuarios: true, partidos: true, grupos: true } } },
  });

  return (
    <div className="flex flex-col gap-4">
      <AltaDeporte />

      <div>
        {deportes.map((deporte) => (
          <div key={deporte.id} className="flex items-baseline gap-3 border-b border-borde py-2.5 last:border-b-0">
            <span className="flex-1 text-sm font-semibold">{deporte.nombre}</span>
            <span className="t-rotulo tabular">
              {deporte._count.usuarios} jugadores · {deporte._count.partidos} partidos ·{' '}
              {deporte._count.grupos} grupos
            </span>
          </div>
        ))}
      </div>
      <p className="text-xs text-tinta-3">
        Los deportes no se borran (hay perfiles y partidos colgados de ellos); si uno sobra,
        avisá y lo despublicamos.
      </p>
    </div>
  );
}
