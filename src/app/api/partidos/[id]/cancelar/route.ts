import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { usuarioActual } from '@/lib/auth';

/** Cancela el partido y avisa a todos los anotados. Solo quien organiza. */
export async function POST(request: Request, contexto: { params: Promise<{ id: string }> }) {
  const usuario = await usuarioActual();
  if (!usuario) return NextResponse.json({ error: 'Entrá primero.' }, { status: 401 });

  const { id } = await contexto.params;
  const partido = await prisma.partido.findUnique({
    where: { id },
    include: { deporte: true, participaciones: { select: { usuarioId: true } } },
  });
  if (!partido) return NextResponse.json({ error: 'Ese partido no existe.' }, { status: 404 });
  if (partido.organizadorId !== usuario.id && partido.coOrganizadorId !== usuario.id) {
    return NextResponse.json({ error: 'Cancela quien organiza.' }, { status: 403 });
  }
  if (partido.estado === 'JUGADO' || partido.estado === 'CANCELADO') {
    return NextResponse.json({ error: 'Ese partido ya no se puede cancelar.' }, { status: 409 });
  }

  const avisar = partido.participaciones.filter((p) => p.usuarioId !== usuario.id);
  await prisma.$transaction([
    prisma.partido.update({ where: { id: partido.id }, data: { estado: 'CANCELADO' } }),
    prisma.notificacion.createMany({
      data: avisar.map((p) => ({
        usuarioId: p.usuarioId,
        tipo: 'PARTIDO_CANCELADO',
        titulo: `Se canceló el ${partido.deporte.nombre} de ${partido.lugarNombre}`,
        cuerpo: 'El organizador dio de baja el partido. Buscá otro en Explorar.',
        url: `/partidos/${partido.id}`,
      })),
    }),
  ]);

  return NextResponse.json({ listo: true });
}
