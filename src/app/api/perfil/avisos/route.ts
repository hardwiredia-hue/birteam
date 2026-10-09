import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { usuarioActual } from '@/lib/auth';
import { PREFERENCIAS_AVISOS } from '@/lib/avisos';

const esquema = z.object({ clave: z.enum(PREFERENCIAS_AVISOS), valor: z.boolean() });

/** Prender o apagar un tipo de aviso. */
export async function PATCH(request: Request) {
  const usuario = await usuarioActual();
  if (!usuario) return NextResponse.json({ error: 'Entrá primero.' }, { status: 401 });
  const datos = esquema.safeParse(await request.json().catch(() => null));
  if (!datos.success) return NextResponse.json({ error: 'Pedido inválido.' }, { status: 400 });
  await prisma.usuario.update({
    where: { id: usuario.id },
    data: { [datos.data.clave]: datos.data.valor },
  });
  return NextResponse.json({ listo: true });
}
