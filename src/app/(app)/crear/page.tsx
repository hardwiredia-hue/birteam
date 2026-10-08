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

  const [deportes, membresias, lugares, seguimientos, canchasPublicadas] = await Promise.all([
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
    prisma.cancha.findMany({
      where: { activa: true, dueno: { suscripcionHasta: { gt: new Date() } } },
      select: {
        id: true,
        nombre: true,
        direccion: true,
        telefono: true,
        ciudad: true,
        diasDisponibles: true,
        deporte: { select: { nombre: true } },
      },
      orderBy: { creadoEn: 'desc' },
      take: 20,
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
      canchas={canchasPublicadas.map((cancha) => {
        let dias: number[] = [0, 1, 2, 3, 4, 5, 6];
        try {
          dias = JSON.parse(cancha.diasDisponibles);
        } catch {
          dias = [0, 1, 2, 3, 4, 5, 6];
        }
        return {
          id: cancha.id,
          nombre: cancha.nombre,
          direccion: cancha.direccion,
          telefono: cancha.telefono,
          ciudad: cancha.ciudad,
          deporte: cancha.deporte.nombre,
          diasDisponibles: dias,
        };
      })}
      seguidores={seguimientos.map((s) => s.seguidor)}
      grupoInicial={grupoInicial?.id ?? null}
      deporteInicial={deporteInicial}
    />
  );
}
