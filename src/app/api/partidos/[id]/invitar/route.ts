import { NextResponse } from 'next/server';
import { z } from 'zod';
import { usuarioActual } from '@/lib/auth';
import { invitarAPartido } from '@/lib/invitaciones';

const esquema = z.object({ usuarioId: z.string().min(1) });

/** Invitar a una persona a este partido (desde su perfil). */
export async function POST(request: Request, contexto: { params: Promise<{ id: string }> }) {
  const usuario = await usuarioActual();
  if (!usuario) return NextResponse.json({ error: 'Entrá primero.' }, { status: 401 });
  const { id } = await contexto.params;
  const datos = esquema.safeParse(await request.json().catch(() => null));
  if (!datos.success) return NextResponse.json({ error: 'Pedido inválido.' }, { status: 400 });
  const error = await invitarAPartido(usuario, id, datos.data.usuarioId);
  if (error) return NextResponse.json({ error }, { status: 400 });
  return NextResponse.json({ listo: true });
}
