import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { usuarioActual } from '@/lib/auth';
import { PREFERENCIAS_AVISOS } from '@/lib/avisos';
import { RADIOS_AVISOS_KM } from '@/lib/cercania';

const esquema = z.union([
  z.object({ clave: z.enum(PREFERENCIAS_AVISOS), valor: z.boolean() }),
  // Hasta cuántos km avisar (partidos que buscan jugadores, Radar).
  z.object({ clave: z.literal('radioKm'), valor: z.number().refine((km) => (RADIOS_AVISOS_KM as readonly number[]).includes(km)) }),
]);

/** Prender o apagar un tipo de aviso, o cambiar la distancia de los avisos. */
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
