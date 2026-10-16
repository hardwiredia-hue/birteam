import { randomBytes } from 'crypto';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { usuarioActual } from '@/lib/auth';
import { rutaCalendario } from '@/lib/calendario-eventos';

/** Crear el link del calendario sincronizado (o cambiarlo: el anterior deja de andar). */
export async function POST() {
  const usuario = await usuarioActual();
  if (!usuario) return NextResponse.json({ error: 'Entrá primero.' }, { status: 401 });
  const token = randomBytes(24).toString('base64url');
  await prisma.usuario.update({ where: { id: usuario.id }, data: { tokenCalendario: token } });
  return NextResponse.json({ ruta: rutaCalendario(token) });
}

/** Apagarlo: el calendario deja de recibir novedades. */
export async function DELETE() {
  const usuario = await usuarioActual();
  if (!usuario) return NextResponse.json({ error: 'Entrá primero.' }, { status: 401 });
  await prisma.usuario.update({ where: { id: usuario.id }, data: { tokenCalendario: null } });
  return NextResponse.json({ listo: true });
}
