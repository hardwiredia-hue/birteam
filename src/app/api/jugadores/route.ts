import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { usuarioActual } from '@/lib/auth';
import { idsBloqueados } from '@/lib/bloqueos';

/** Buscar jugadores por nombre o usuario (para invitar al partido). */
export async function GET(request: Request) {
  const usuario = await usuarioActual();
  if (!usuario) return NextResponse.json({ error: 'Entrá primero.' }, { status: 401 });

  const q = new URL(request.url).searchParams.get('q')?.trim() ?? '';
  if (q.length < 2) return NextResponse.json({ jugadores: [] });

  const ocultos = await idsBloqueados(usuario.id);
  const jugadores = await prisma.usuario.findMany({
    where: {
      id: { not: usuario.id, notIn: ocultos },
      eliminadoEn: null,
      OR: [{ nombre: { contains: q } }, { usuario: { contains: q.toLowerCase() } }],
    },
    select: { id: true, nombre: true, usuario: true },
    take: 8,
  });

  return NextResponse.json({ jugadores });
}
