import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { usuarioActual } from '@/lib/auth';

/** Alterna tu me gusta en una jugada. */
export async function POST(_request: Request, contexto: { params: Promise<{ id: string }> }) {
  const usuario = await usuarioActual();
  if (!usuario) return NextResponse.json({ error: 'Entrá primero.' }, { status: 401 });

  const { id } = await contexto.params;
  const jugada = await prisma.jugada.findUnique({ where: { id }, select: { id: true } });
  if (!jugada) return NextResponse.json({ error: 'Esa jugada no existe.' }, { status: 404 });

  const existente = await prisma.meGustaJugada.findUnique({
    where: { jugadaId_usuarioId: { jugadaId: id, usuarioId: usuario.id } },
  });
  if (existente) {
    await prisma.meGustaJugada.delete({
      where: { jugadaId_usuarioId: { jugadaId: id, usuarioId: usuario.id } },
    });
  } else {
    await prisma.meGustaJugada.create({ data: { jugadaId: id, usuarioId: usuario.id } });
  }

  const total = await prisma.meGustaJugada.count({ where: { jugadaId: id } });
  return NextResponse.json({ meGusta: !existente, total });
}
