import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { usuarioActual } from '@/lib/auth';
import { enviarPush } from '@/lib/push';

/** Alterna tu me gusta en una jugada. */
export async function POST(_request: Request, contexto: { params: Promise<{ id: string }> }) {
  const usuario = await usuarioActual();
  if (!usuario) return NextResponse.json({ error: 'Entrá primero.' }, { status: 401 });

  const { id } = await contexto.params;
  const jugada = await prisma.jugada.findUnique({
    where: { id },
    select: { id: true, autorId: true },
  });
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

    // Aviso al autor, una sola vez por persona (el toque-destoque no spamea).
    if (jugada.autorId !== usuario.id) {
      const titulo = `A ${usuario.nombre} le gustó tu jugada`;
      const yaAvisado = await prisma.notificacion.findFirst({
        where: { usuarioId: jugada.autorId, tipo: 'ME_GUSTA', titulo, url: `/birtsocial` },
      });
      if (!yaAvisado) {
        const aviso = { titulo, url: `/birtsocial` };
        await prisma.notificacion.create({
          data: { usuarioId: jugada.autorId, tipo: 'ME_GUSTA', ...aviso },
        });
        await enviarPush(jugada.autorId, aviso);
      }
    }
  }

  const total = await prisma.meGustaJugada.count({ where: { jugadaId: id } });
  return NextResponse.json({ meGusta: !existente, total });
}
