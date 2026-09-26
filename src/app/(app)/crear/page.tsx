import { prisma } from '@/lib/db';
import { usuarioActual } from '@/lib/auth';
import { Asistente } from './asistente';

export const metadata = { title: 'Crear partido' };
export const dynamic = 'force-dynamic';

export default async function Crear({
  searchParams,
}: {
  searchParams: Promise<{ grupo?: string; deporte?: string }>;
}) {
  const { grupo, deporte } = await searchParams;
  const usuario = (await usuarioActual())!;

  const [deportes, membresias] = await Promise.all([
    prisma.deporte.findMany({
      orderBy: { orden: 'asc' },
      select: { id: true, nombre: true, slug: true },
    }),
    prisma.miembroGrupo.findMany({
      where: { usuarioId: usuario.id },
      include: { grupo: { select: { id: true, nombre: true, deporteId: true } } },
    }),
  ]);

  const grupos = membresias.map((membresia) => membresia.grupo);
  const grupoInicial = grupos.find((g) => g.id === grupo) ?? null;
  const deporteInicial = deportes.find((d) => d.slug === deporte)?.id ?? null;

  return (
    <Asistente
      deportes={deportes}
      grupos={grupos}
      grupoInicial={grupoInicial?.id ?? null}
      deporteInicial={deporteInicial}
    />
  );
}
