import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { adminActual } from '@/lib/admin';

export async function PATCH(request: Request) {
  const admin = await adminActual();
  if (!admin) return NextResponse.json({ error: 'Solo administración.' }, { status: 403 });

  const cuerpo = await request.json().catch(() => ({}));
  const usuarioId = String(cuerpo.usuarioId ?? '');
  const rol = String(cuerpo.rol ?? '');
  if (!usuarioId || !['USUARIO', 'ADMIN'].includes(rol)) {
    return NextResponse.json({ error: 'Datos incompletos.' }, { status: 400 });
  }
  // Nadie se saca su propio admin: evita quedarse afuera del backoffice.
  if (usuarioId === admin.id) {
    return NextResponse.json({ error: 'Tu propio rol no se toca desde acá.' }, { status: 400 });
  }

  await prisma.usuario.update({ where: { id: usuarioId }, data: { rol } });
  return NextResponse.json({ listo: true });
}
