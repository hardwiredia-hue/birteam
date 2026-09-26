import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { usuarioActual } from '@/lib/auth';
import { esquemaBloqueo, erroresDeZod } from '@/lib/validacion';

export async function POST(request: Request) {
  const usuario = await usuarioActual();
  if (!usuario) return NextResponse.json({ error: 'Entrá primero.' }, { status: 401 });

  const cuerpo = await request.json().catch(() => null);
  const datos = esquemaBloqueo.safeParse(cuerpo);
  if (!datos.success) {
    return NextResponse.json(
      { error: 'Revisá los datos.', detalles: erroresDeZod(datos.error) },
      { status: 400 }
    );
  }
  const { usuarioId, accion } = datos.data;

  if (usuarioId === usuario.id) {
    return NextResponse.json({ error: 'No podés bloquearte a vos.' }, { status: 400 });
  }

  if (accion === 'bloquear') {
    const existe = await prisma.usuario.findUnique({ where: { id: usuarioId }, select: { id: true } });
    if (!existe) return NextResponse.json({ error: 'Ese usuario no existe.' }, { status: 404 });
    await prisma.bloqueo.upsert({
      where: { bloqueadorId_bloqueadoId: { bloqueadorId: usuario.id, bloqueadoId: usuarioId } },
      update: {},
      create: { bloqueadorId: usuario.id, bloqueadoId: usuarioId },
    });
  } else {
    await prisma.bloqueo.deleteMany({
      where: { bloqueadorId: usuario.id, bloqueadoId: usuarioId },
    });
  }

  return NextResponse.json({ listo: true });
}
