import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { adminActual } from '@/lib/admin';
import { registrarEvento } from '@/lib/mercadopago';

/** Fijar la comisión de birteam sobre los cobros online (0 a 30 %). Solo administración. */
export async function POST(request: Request) {
  const admin = await adminActual();
  if (!admin) return NextResponse.json({ error: 'Solo administración.' }, { status: 403 });
  const cuerpo = await request.json().catch(() => ({}));
  const valor = Number(cuerpo?.porcentaje);
  if (!Number.isFinite(valor) || valor < 0 || valor > 30) {
    return NextResponse.json({ error: 'La comisión va de 0 a 30 %.' }, { status: 400 });
  }
  const redondeado = Math.round(valor * 10) / 10;
  await prisma.ajuste.upsert({
    where: { clave: 'comision_porcentaje' },
    create: { clave: 'comision_porcentaje', valor: String(redondeado) },
    update: { valor: String(redondeado) },
  });
  await registrarEvento(null, 'COMISION_CAMBIADA', `${redondeado}% por ${admin.usuario}`);
  return NextResponse.json({ porcentaje: redondeado });
}
