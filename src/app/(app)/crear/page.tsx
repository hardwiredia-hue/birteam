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

  const [deportes, membresias, lugares, seguimientos] = await Promise.all([
    prisma.deporte.findMany({
      orderBy: { orden: 'asc' },
      select: { id: true, nombre: true, slug: true },
    }),
    prisma.miembroGrupo.findMany({
      where: { usuarioId: usuario.id },
      include: { grupo: { select: { id: true, nombre: true, deporteId: true } } },
    }),
    prisma.lugarGuardado.findMany({
      where: { usuarioId: usuario.id },
      orderBy: { ultimaVez: 'desc' },
      take: 8,
      select: { id: true, nombre: true, direccion: true, telefono: true },
    }),
    prisma.seguimiento.findMany({
      where: { seguidoId: usuario.id },
      include: { seguidor: { select: { id: true, nombre: true, usuario: true } } },
      orderBy: { creadoEn: 'desc' },
      take: 50,
    }),
  ]);

  const grupos = membresias.map((membresia) => membresia.grupo);
  const grupoInicial = grupos.find((g) => g.id === grupo) ?? null;
  const deporteInicial = deportes.find((d) => d.slug === deporte)?.id ?? null;

  return (
    <Asistente
      deportes={deportes}
      grupos={grupos}
      lugares={lugares}
      seguidores={seguimientos.map((s) => s.seguidor)}
      grupoInicial={grupoInicial?.id ?? null}
      deporteInicial={deporteInicial}
    />
  );
}
