import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { usuarioActual } from '@/lib/auth';
import { PORCENTAJE_MAXIMO, PORCENTAJE_MINIMO, REDONDEOS, nuevoPrecio } from '@/lib/precios';

const esquema = z.object({
  porcentaje: z.number().min(PORCENTAJE_MINIMO).max(PORCENTAJE_MAXIMO).refine((p) => p !== 0, 'Poné un porcentaje.'),
  redondeo: z.number().refine((r) => (REDONDEOS as readonly number[]).includes(r)),
});

/** Aumentar (o bajar) los precios de todas las canchas del complejo. Solo el dueño. */
export async function POST(request: Request) {
  const usuario = await usuarioActual();
  if (!usuario || usuario.tipoCuenta !== 'CANCHA') {
    return NextResponse.json({ error: 'Solo para el dueño del complejo.' }, { status: 403 });
  }
  const datos = esquema.safeParse(await request.json().catch(() => null));
  if (!datos.success) return NextResponse.json({ error: 'Revisá el porcentaje.' }, { status: 400 });
  const { porcentaje, redondeo } = datos.data;

  const canchas = await prisma.cancha.findMany({
    where: { duenoId: usuario.id, OR: [{ precioPorHora: { not: null } }, { precioPico: { not: null } }] },
    select: { id: true, precioPorHora: true, precioPico: true },
  });
  await prisma.$transaction(
    canchas.map((cancha) =>
      prisma.cancha.update({
        where: { id: cancha.id },
        data: {
          precioPorHora: cancha.precioPorHora != null ? nuevoPrecio(cancha.precioPorHora, porcentaje, redondeo) : null,
          precioPico: cancha.precioPico != null ? nuevoPrecio(cancha.precioPico, porcentaje, redondeo) : null,
        },
      })
    )
  );
  return NextResponse.json({ actualizadas: canchas.length });
}
