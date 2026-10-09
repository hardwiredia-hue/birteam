import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { quiere } from '@/lib/avisos';
import { usuarioActual } from '@/lib/auth';
import { enviarPush } from '@/lib/push';

/** Seguir o dejar de seguir a un usuario. */
export async function POST(request: Request) {
  const usuario = await usuarioActual();
  if (!usuario) return NextResponse.json({ error: 'Entrá primero.' }, { status: 401 });

  const cuerpo = await request.json().catch(() => ({}));
  const usuarioId = String(cuerpo.usuarioId ?? '');
  const accion = String(cuerpo.accion ?? '');
  if (!usuarioId || !['seguir', 'dejar'].includes(accion)) {
    return NextResponse.json({ error: 'Datos incompletos.' }, { status: 400 });
  }
  if (usuarioId === usuario.id) {
    return NextResponse.json({ error: 'No podés seguirte a vos.' }, { status: 400 });
  }

  if (accion === 'seguir') {
    const otro = await prisma.usuario.findUnique({ where: { id: usuarioId }, select: { id: true } });
    if (!otro) return NextResponse.json({ error: 'Ese usuario no existe.' }, { status: 404 });

    const previo = await prisma.seguimiento.findUnique({
      where: { seguidorId_seguidoId: { seguidorId: usuario.id, seguidoId: usuarioId } },
    });
    if (!previo) {
      await prisma.seguimiento.create({
        data: { seguidorId: usuario.id, seguidoId: usuarioId },
      });
    }
    if (!previo && (await quiere(usuarioId, 'avisosSociales'))) {
      await prisma.notificacion.create({
        data: {
          usuarioId,
          tipo: 'NUEVO_SEGUIDOR',
          titulo: `${usuario.nombre} te empezó a seguir`,
          url: `/jugadores/${usuario.usuario}`,
        },
      });
      await enviarPush(usuarioId, {
        titulo: `${usuario.nombre} te empezó a seguir`,
        url: `/jugadores/${usuario.usuario}`,
      });
    }
  } else {
    await prisma.seguimiento.deleteMany({
      where: { seguidorId: usuario.id, seguidoId: usuarioId },
    });
  }

  const seguidores = await prisma.seguimiento.count({ where: { seguidoId: usuarioId } });
  return NextResponse.json({ siguiendo: accion === 'seguir', seguidores });
}
