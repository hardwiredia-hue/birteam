import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { adminActual } from '@/lib/admin';

/** Prender o apagar el modo "En construcción". Solo administración. */
export async function POST(request: Request) {
  const admin = await adminActual();
  if (!admin) return NextResponse.json({ error: 'Solo administración.' }, { status: 403 });

  const cuerpo = await request.json().catch(() => ({}));
  if (typeof cuerpo?.enConstruccion !== 'boolean') {
    return NextResponse.json({ error: 'Datos incompletos.' }, { status: 400 });
  }

  await prisma.ajuste.upsert({
    where: { clave: 'en_construccion' },
    create: { clave: 'en_construccion', valor: cuerpo.enConstruccion ? '1' : '0' },
    update: { valor: cuerpo.enConstruccion ? '1' : '0' },
  });

  return NextResponse.json({ enConstruccion: cuerpo.enConstruccion });
}
