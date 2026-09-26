import { prisma } from '@/lib/db';
import { Asistente } from './asistente';

export const metadata = { title: 'Crear partido' };
export const dynamic = 'force-dynamic';

export default async function Crear() {
  const deportes = await prisma.deporte.findMany({
    orderBy: { orden: 'asc' },
    select: { id: true, nombre: true },
  });

  return <Asistente deportes={deportes} />;
}
