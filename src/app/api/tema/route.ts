import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/db';
import { usuarioActual } from '@/lib/auth';
import { TEMAS } from '@/lib/constantes';

export async function POST(request: Request) {
  const usuario = await usuarioActual();
  if (!usuario) return NextResponse.json({ error: 'Entrá para cambiar el tema.' }, { status: 401 });

  const cuerpo = await request.json().catch(() => ({}));
  const tema = String(cuerpo.tema ?? '');
  if (!(TEMAS as readonly string[]).includes(tema)) {
    return NextResponse.json({ error: 'Tema desconocido.' }, { status: 400 });
  }

  await prisma.usuario.update({ where: { id: usuario.id }, data: { tema } });
  (await cookies()).set('birteam_tema', tema, {
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 365,
    path: '/',
  });

  return NextResponse.json({ listo: true });
}
