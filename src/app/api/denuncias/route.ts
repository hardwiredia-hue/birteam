import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { usuarioActual } from '@/lib/auth';
import { esquemaDenuncia, erroresDeZod } from '@/lib/validacion';

export async function POST(request: Request) {
  const usuario = await usuarioActual();
  if (!usuario) return NextResponse.json({ error: 'Entrá primero.' }, { status: 401 });

  const cuerpo = await request.json().catch(() => null);
  const datos = esquemaDenuncia.safeParse(cuerpo);
  if (!datos.success) {
    return NextResponse.json(
      { error: 'Revisá los datos.', detalles: erroresDeZod(datos.error) },
      { status: 400 }
    );
  }
  const d = datos.data;

  if (d.denunciadoId === usuario.id) {
    return NextResponse.json({ error: 'No podés denunciarte a vos.' }, { status: 400 });
  }
  if (d.denunciadoId) {
    const existe = await prisma.usuario.findUnique({ where: { id: d.denunciadoId }, select: { id: true } });
    if (!existe) return NextResponse.json({ error: 'Ese usuario no existe.' }, { status: 404 });
  }
  if (d.partidoId) {
    const existe = await prisma.partido.findUnique({ where: { id: d.partidoId }, select: { id: true } });
    if (!existe) return NextResponse.json({ error: 'Ese partido no existe.' }, { status: 404 });
  }

  await prisma.denuncia.create({
    data: {
      denuncianteId: usuario.id,
      denunciadoId: d.denunciadoId ?? null,
      partidoId: d.partidoId ?? null,
      motivo: d.motivo,
      detalle: d.detalle ?? null,
    },
  });

  return NextResponse.json({ listo: true }, { status: 201 });
}
