import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { usuarioActual } from '@/lib/auth';

/** Sacar una oferta del Radar. Solo el dueño de la cancha. */
export async function DELETE(request: Request, contexto: { params: Promise<{ id: string }> }) {
  const usuario = await usuarioActual();
  if (!usuario) return NextResponse.json({ error: 'Entrá primero.' }, { status: 401 });

  const { id } = await contexto.params;
  const oferta = await prisma.ofertaTurno.findUnique({
    where: { id },
    include: { cancha: { select: { duenoId: true } } },
  });
  if (!oferta) return NextResponse.json({ error: 'Esa oferta ya no existe.' }, { status: 404 });
  if (oferta.cancha.duenoId !== usuario.id) {
    return NextResponse.json({ error: 'La saca el dueño de la cancha.' }, { status: 403 });
  }
  await prisma.ofertaTurno.delete({ where: { id: oferta.id } });
  return NextResponse.json({ listo: true });
}
