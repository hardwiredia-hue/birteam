import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { adminActual } from '@/lib/admin';

export async function PATCH(request: Request) {
  const admin = await adminActual();
  if (!admin) return NextResponse.json({ error: 'Solo administración.' }, { status: 403 });

  const cuerpo = await request.json().catch(() => ({}));
  const denunciaId = String(cuerpo.denunciaId ?? '');
  const estado = String(cuerpo.estado ?? '');
  if (!denunciaId || !['RESUELTA', 'DESCARTADA'].includes(estado)) {
    return NextResponse.json({ error: 'Datos incompletos.' }, { status: 400 });
  }

  await prisma.denuncia.update({ where: { id: denunciaId }, data: { estado } });
  return NextResponse.json({ listo: true });
}
