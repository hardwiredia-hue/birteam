import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { usuarioActual } from '@/lib/auth';

/** Sumarse a un grupo con el token del link de invitación. */
export async function POST(request: Request) {
  const usuario = await usuarioActual();
  if (!usuario) return NextResponse.json({ error: 'Entrá para sumarte.' }, { status: 401 });

  const cuerpo = await request.json().catch(() => ({}));
  const token = String(cuerpo.token ?? '');
  if (!token) return NextResponse.json({ error: 'Falta el link de invitación.' }, { status: 400 });

  const grupo = await prisma.grupo.findUnique({ where: { tokenInvitacion: token } });
  if (!grupo) return NextResponse.json({ error: 'Ese link de invitación no existe.' }, { status: 404 });

  await prisma.miembroGrupo.upsert({
    where: { grupoId_usuarioId: { grupoId: grupo.id, usuarioId: usuario.id } },
    update: {},
    create: { grupoId: grupo.id, usuarioId: usuario.id },
  });

  return NextResponse.json({ id: grupo.id });
}
