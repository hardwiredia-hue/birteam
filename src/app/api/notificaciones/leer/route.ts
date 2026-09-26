import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { usuarioActual } from '@/lib/auth';

/** Marca todas tus notificaciones como leídas. */
export async function POST() {
  const usuario = await usuarioActual();
  if (!usuario) return NextResponse.json({ error: 'Entrá primero.' }, { status: 401 });

  await prisma.notificacion.updateMany({
    where: { usuarioId: usuario.id, leidaEn: null },
    data: { leidaEn: new Date() },
  });
  return NextResponse.json({ listo: true });
}
