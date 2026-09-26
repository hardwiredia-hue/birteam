import { prisma } from '@/lib/db';
import { usuarioActual } from '@/lib/auth';
import { Asistente } from './asistente';

export const metadata = { title: 'Crear partido' };
export const dynamic = 'force-dynamic';

export default async function Crear({
  searchParams,
}: {
  searchParams: Promise<{ grupo?: string }>;
}) {
  const { grupo } = await searchParams;
  const usuario = (await usuarioActual())!;

  const [deportes, membresias] = await Promise.all([
    prisma.deporte.findMany({ orderBy: { orden: 'asc' }, select: { id: true, nombre: true } }),
    prisma.miembroGrupo.findMany({
      where: { usuarioId: usuario.id },
      include: { grupo: { select: { id: true, nombre: true, deporteId: true } } },
    }),
  ]);

  const grupos = membresias.map((membresia) => membresia.grupo);
  const grupoInicial = grupos.find((g) => g.id === grupo) ?? null;

  return <Asistente deportes={deportes} grupos={grupos} grupoInicial={grupoInicial?.id ?? null} />;
}
