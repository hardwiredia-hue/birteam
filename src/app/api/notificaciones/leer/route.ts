import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { usuarioActual } from '@/lib/auth';

/**
 * Marca como leídas tus notificaciones: una sola (al tocarla, con { id }) o
 * todas ("Marcar leídos", sin cuerpo).
 */
export async function POST(request: Request) {
  const usuario = await usuarioActual();
  if (!usuario) return NextResponse.json({ error: 'Entrá primero.' }, { status: 401 });

  const cuerpo = await request.json().catch(() => null);
  const id = cuerpo && typeof cuerpo.id === 'string' ? cuerpo.id : null;
  await prisma.notificacion.updateMany({
    where: { usuarioId: usuario.id, leidaEn: null, ...(id ? { id } : {}) },
    data: { leidaEn: new Date() },
  });
  return NextResponse.json({ listo: true });
}
