import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { adminActual } from '@/lib/admin';
import { registrarEvento, simulacionPermitida } from '@/lib/mercadopago';

/** Prender o apagar el simulador de pagos. Solo administración y nunca en producción. */
export async function POST(request: Request) {
  const admin = await adminActual();
  if (!admin) return NextResponse.json({ error: 'Solo administración.' }, { status: 403 });
  if (!simulacionPermitida()) {
    return NextResponse.json({ error: 'El simulador solo existe en staging.' }, { status: 403 });
  }
  const cuerpo = await request.json().catch(() => ({}));
  if (typeof cuerpo?.prendido !== 'boolean') {
    return NextResponse.json({ error: 'Datos incompletos.' }, { status: 400 });
  }
  await prisma.ajuste.upsert({
    where: { clave: 'pagos_simulados' },
    create: { clave: 'pagos_simulados', valor: cuerpo.prendido ? '1' : '0' },
    update: { valor: cuerpo.prendido ? '1' : '0' },
  });
  await registrarEvento(null, cuerpo.prendido ? 'SIMULADOR_PRENDIDO' : 'SIMULADOR_APAGADO', admin.usuario);
  return NextResponse.json({ prendido: cuerpo.prendido });
}
