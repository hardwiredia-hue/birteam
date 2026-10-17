import { NextResponse } from 'next/server';
import { z } from 'zod';
import { usuarioActual } from '@/lib/auth';
import { pedirFijo } from '@/lib/pedidos-fijo';

const esquema = z.object({
  diaSemana: z.number().int().min(0).max(6),
  hora: z.string().regex(/^\d{2}:\d{2}$/),
  nota: z.string().trim().max(200).nullish(),
});

/** El jugador pide un turno fijo en esta cancha. */
export async function POST(request: Request, contexto: { params: Promise<{ id: string }> }) {
  const usuario = await usuarioActual();
  if (!usuario) return NextResponse.json({ error: 'Entrá primero.' }, { status: 401 });
  const datos = esquema.safeParse(await request.json().catch(() => null));
  if (!datos.success) return NextResponse.json({ error: 'Elegí el día y la hora.' }, { status: 400 });
  const error = await pedirFijo(usuario, (await contexto.params).id, datos.data);
  if (error) return NextResponse.json({ error }, { status: 400 });
  return NextResponse.json({ listo: true }, { status: 201 });
}
