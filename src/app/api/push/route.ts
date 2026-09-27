import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { usuarioActual } from '@/lib/auth';
import { esquemaSuscripcionPush, erroresDeZod } from '@/lib/validacion';

/** Alta de una suscripción push del navegador (una por dispositivo). */
export async function POST(request: Request) {
  const usuario = await usuarioActual();
  if (!usuario) return NextResponse.json({ error: 'Entrá primero.' }, { status: 401 });

  const cuerpo = await request.json().catch(() => null);
  const datos = esquemaSuscripcionPush.safeParse(cuerpo);
  if (!datos.success) {
    return NextResponse.json(
      { error: 'Suscripción inválida.', detalles: erroresDeZod(datos.error) },
      { status: 400 }
    );
  }

  // Si el endpoint ya existía (mismo navegador, otra cuenta), pasa al usuario actual.
  await prisma.suscripcionPush.upsert({
    where: { endpoint: datos.data.endpoint },
    create: {
      usuarioId: usuario.id,
      endpoint: datos.data.endpoint,
      p256dh: datos.data.keys.p256dh,
      auth: datos.data.keys.auth,
    },
    update: {
      usuarioId: usuario.id,
      p256dh: datos.data.keys.p256dh,
      auth: datos.data.keys.auth,
    },
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}

/** Baja: este dispositivo deja de recibir avisos. */
export async function DELETE(request: Request) {
  const usuario = await usuarioActual();
  if (!usuario) return NextResponse.json({ error: 'Entrá primero.' }, { status: 401 });

  const cuerpo = await request.json().catch(() => null);
  const endpoint = typeof cuerpo?.endpoint === 'string' ? cuerpo.endpoint : null;
  if (!endpoint) return NextResponse.json({ error: 'Falta el endpoint.' }, { status: 400 });

  await prisma.suscripcionPush.deleteMany({
    where: { endpoint, usuarioId: usuario.id },
  });

  return NextResponse.json({ ok: true });
}
