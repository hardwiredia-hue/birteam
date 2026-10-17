import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { usuarioActual } from '@/lib/auth';
import { esClaveValida } from '@/lib/disponibilidad';

const esquema = z.object({ claves: z.array(z.string().refine(esClaveValida)).max(21) });

/** Guarda cuándo puede jugar (días y franjas). */
export async function PUT(request: Request) {
  const usuario = await usuarioActual();
  if (!usuario) return NextResponse.json({ error: 'Entrá primero.' }, { status: 401 });
  const datos = esquema.safeParse(await request.json().catch(() => null));
  if (!datos.success) return NextResponse.json({ error: 'Pedido inválido.' }, { status: 400 });
  await prisma.usuario.update({
    where: { id: usuario.id },
    data: { disponibilidad: JSON.stringify([...new Set(datos.data.claves)].sort()) },
  });
  return NextResponse.json({ listo: true });
}
