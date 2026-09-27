import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { adminActual } from '@/lib/admin';
import { guardarImagen } from '@/lib/archivos';
import { CLAVES_MARCA, type ClaveMarca } from '@/lib/marca';

function claveValida(tipo: unknown): tipo is ClaveMarca {
  return typeof tipo === 'string' && (CLAVES_MARCA as readonly string[]).includes(tipo);
}

/** Sube el logo, el ícono o el favicon nuevos. Solo administración. */
export async function POST(request: Request) {
  const admin = await adminActual();
  if (!admin) return NextResponse.json({ error: 'Solo administración.' }, { status: 403 });

  const form = await request.formData().catch(() => null);
  const tipo = form?.get('tipo');
  if (!claveValida(tipo)) {
    return NextResponse.json({ error: 'Tipo de imagen desconocido.' }, { status: 400 });
  }

  const resultado = await guardarImagen(form?.get('archivo'));
  if (!resultado.ok) {
    return NextResponse.json({ error: resultado.error }, { status: resultado.status });
  }

  await prisma.ajuste.upsert({
    where: { clave: tipo },
    create: { clave: tipo, valor: resultado.url },
    update: { valor: resultado.url },
  });

  return NextResponse.json({ url: resultado.url }, { status: 201 });
}

/** Vuelve al archivo de fábrica del repo. */
export async function DELETE(request: Request) {
  const admin = await adminActual();
  if (!admin) return NextResponse.json({ error: 'Solo administración.' }, { status: 403 });

  const cuerpo = await request.json().catch(() => ({}));
  if (!claveValida(cuerpo?.tipo)) {
    return NextResponse.json({ error: 'Tipo de imagen desconocido.' }, { status: 400 });
  }

  await prisma.ajuste.deleteMany({ where: { clave: cuerpo.tipo } });
  return NextResponse.json({ listo: true });
}
