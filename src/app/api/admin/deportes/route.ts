import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { adminActual } from '@/lib/admin';
import { slugificar } from '@/lib/normalizar';

export async function POST(request: Request) {
  const admin = await adminActual();
  if (!admin) return NextResponse.json({ error: 'Solo administración.' }, { status: 403 });

  const cuerpo = await request.json().catch(() => ({}));
  const nombre = String(cuerpo.nombre ?? '').trim();
  if (nombre.length < 2 || nombre.length > 40) {
    return NextResponse.json({ error: 'El nombre necesita entre 2 y 40 caracteres.' }, { status: 400 });
  }

  const slug = slugificar(nombre);
  const existente = await prisma.deporte.findUnique({ where: { slug } });
  if (existente) {
    return NextResponse.json({ error: `Ya existe: ${existente.nombre}.` }, { status: 409 });
  }

  const ultimo = await prisma.deporte.aggregate({ _max: { orden: true } });
  const deporte = await prisma.deporte.create({
    data: { nombre, slug, orden: (ultimo._max.orden ?? 0) + 1 },
  });

  return NextResponse.json({ id: deporte.id }, { status: 201 });
}
