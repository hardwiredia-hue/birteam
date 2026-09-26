import { prisma } from '@/lib/db';
import { FormularioGrupo } from './formulario';

export const metadata = { title: 'Crear grupo' };
export const dynamic = 'force-dynamic';

export default async function NuevoGrupo() {
  const deportes = await prisma.deporte.findMany({
    orderBy: { orden: 'asc' },
    select: { id: true, nombre: true },
  });

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="t-display text-[28px]">Armá tu grupo</h1>
        <p className="mt-2 text-sm text-tinta-2">
          Una vez armado, cada partido se organiza con un toque y el link suma gente por WhatsApp.
        </p>
      </div>
      <FormularioGrupo deportes={deportes} />
    </div>
  );
}
