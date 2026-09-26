import { prisma } from '@/lib/db';
import { FormularioTorneo } from './formulario';

export const metadata = { title: 'Crear torneo' };
export const dynamic = 'force-dynamic';

export default async function NuevoTorneo() {
  const deportes = await prisma.deporte.findMany({
    orderBy: { orden: 'asc' },
    select: { id: true, nombre: true },
  });

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="t-display text-[28px]">Armá tu torneo</h1>
        <p className="mt-2 text-sm text-tinta-2">
          Liga, todos contra todos: los equipos se inscriben, el fixture se genera solo y la tabla
          de posiciones se lleva sola con cada resultado.
        </p>
      </div>
      <FormularioTorneo deportes={deportes} />
    </div>
  );
}
