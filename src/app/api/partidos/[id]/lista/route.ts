import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { usuarioActual } from '@/lib/auth';

const esquema = z.object({ cerrada: z.boolean() });

/** Cerrar (o reabrir) la lista del partido. Organiza o co-organiza. */
export async function POST(request: Request, contexto: { params: Promise<{ id: string }> }) {
  const usuario = await usuarioActual();
  if (!usuario) return NextResponse.json({ error: 'Entrá primero.' }, { status: 401 });

  const { id } = await contexto.params;
  const datos = esquema.safeParse(await request.json().catch(() => null));
  if (!datos.success) return NextResponse.json({ error: 'Pedido inválido.' }, { status: 400 });

  const partido = await prisma.partido.findUnique({
    where: { id },
    select: { organizadorId: true, coOrganizadorId: true, estado: true },
  });
  if (!partido) return NextResponse.json({ error: 'Ese partido no existe.' }, { status: 404 });
  if (partido.organizadorId !== usuario.id && partido.coOrganizadorId !== usuario.id) {
    return NextResponse.json({ error: 'La lista la cierra quien organiza.' }, { status: 403 });
  }
  if (partido.estado === 'JUGADO' || partido.estado === 'CANCELADO') {
    return NextResponse.json({ error: 'Ese partido ya cerró.' }, { status: 409 });
  }
  await prisma.partido.update({ where: { id }, data: { listaCerrada: datos.data.cerrada } });
  return NextResponse.json({ listo: true });
}
