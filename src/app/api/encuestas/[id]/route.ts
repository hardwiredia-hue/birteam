import { NextResponse } from 'next/server';
import { z } from 'zod';
import { usuarioActual } from '@/lib/auth';
import { cerrarEncuesta, votar } from '@/lib/encuestas';

const esquemaVoto = z.object({ opcionIds: z.array(z.string().max(40)).max(10) });

/** Marcar los horarios que puedo. */
export async function PUT(request: Request, contexto: { params: Promise<{ id: string }> }) {
  const usuario = await usuarioActual();
  if (!usuario) return NextResponse.json({ error: 'Entrá primero.' }, { status: 401 });
  const datos = esquemaVoto.safeParse(await request.json().catch(() => null));
  if (!datos.success) return NextResponse.json({ error: 'Pedido inválido.' }, { status: 400 });
  const error = await votar(usuario.id, (await contexto.params).id, datos.data.opcionIds);
  if (error) return NextResponse.json({ error }, { status: 400 });
  return NextResponse.json({ listo: true });
}

/** Cerrar la encuesta sin armar partido. */
export async function DELETE(_request: Request, contexto: { params: Promise<{ id: string }> }) {
  const usuario = await usuarioActual();
  if (!usuario) return NextResponse.json({ error: 'Entrá primero.' }, { status: 401 });
  const error = await cerrarEncuesta(usuario.id, (await contexto.params).id);
  if (error) return NextResponse.json({ error }, { status: 400 });
  return NextResponse.json({ listo: true });
}
