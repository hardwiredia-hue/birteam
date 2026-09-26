import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { usuarioActual } from '@/lib/auth';

/** Sumarse a un grupo con el token del link de invitación. */
export async function POST(request: Request) {
  const usuario = await usuarioActual();
  if (!usuario) return NextResponse.json({ error: 'Entrá para sumarte.' }, { status: 401 });

  const cuerpo = await request.json().catch(() => ({}));
  const token = String(cuerpo.token ?? '');
  const grupoId = String(cuerpo.grupoId ?? '');
  if (!token && !grupoId) {
    return NextResponse.json({ error: 'Falta el grupo o el link de invitación.' }, { status: 400 });
  }

  // Por link de invitación entra cualquiera; por id, solo a grupos abiertos.
  const grupo = token
    ? await prisma.grupo.findUnique({ where: { tokenInvitacion: token } })
    : await prisma.grupo.findUnique({ where: { id: grupoId } });
  if (!grupo) return NextResponse.json({ error: 'Ese grupo no existe.' }, { status: 404 });
  if (!token && !grupo.abierto) {
    return NextResponse.json(
      { error: 'Ese grupo es cerrado: se entra con el link de invitación de un miembro.' },
      { status: 403 }
    );
  }

  await prisma.miembroGrupo.upsert({
    where: { grupoId_usuarioId: { grupoId: grupo.id, usuarioId: usuario.id } },
    update: {},
    create: { grupoId: grupo.id, usuarioId: usuario.id },
  });

  return NextResponse.json({ id: grupo.id });
}
