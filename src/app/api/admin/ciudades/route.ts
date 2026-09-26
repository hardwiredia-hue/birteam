import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { adminActual } from '@/lib/admin';
import { normalizar } from '@/lib/normalizar';

export async function POST(request: Request) {
  const admin = await adminActual();
  if (!admin) return NextResponse.json({ error: 'Solo administración.' }, { status: 403 });

  const cuerpo = await request.json().catch(() => ({}));
  const nombre = String(cuerpo.nombre ?? '').trim();
  const provinciaId = String(cuerpo.provinciaId ?? '');
  const latitud = typeof cuerpo.latitud === 'number' ? cuerpo.latitud : null;
  const longitud = typeof cuerpo.longitud === 'number' ? cuerpo.longitud : null;

  if (nombre.length < 2 || nombre.length > 80 || !provinciaId) {
    return NextResponse.json({ error: 'Faltan el nombre o la provincia.' }, { status: 400 });
  }
  const provincia = await prisma.provincia.findUnique({ where: { id: provinciaId } });
  if (!provincia) return NextResponse.json({ error: 'Esa provincia no existe.' }, { status: 404 });

  const existente = await prisma.ciudad.findUnique({
    where: { provinciaId_nombre: { provinciaId, nombre } },
  });
  if (existente) {
    return NextResponse.json({ error: 'Esa ciudad ya está en el catálogo.' }, { status: 409 });
  }

  const ciudad = await prisma.ciudad.create({
    data: { nombre, nombreNorm: normalizar(nombre), provinciaId, latitud, longitud },
  });
  return NextResponse.json({ id: ciudad.id }, { status: 201 });
}

export async function DELETE(request: Request) {
  const admin = await adminActual();
  if (!admin) return NextResponse.json({ error: 'Solo administración.' }, { status: 403 });

  const cuerpo = await request.json().catch(() => ({}));
  const ciudadId = String(cuerpo.ciudadId ?? '');
  if (!ciudadId) return NextResponse.json({ error: 'Falta la ciudad.' }, { status: 400 });

  await prisma.ciudad.delete({ where: { id: ciudadId } }).catch(() => {});
  return NextResponse.json({ listo: true });
}
