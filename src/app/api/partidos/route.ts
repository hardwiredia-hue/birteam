import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { usuarioActual } from '@/lib/auth';
import { esquemaPartido, erroresDeZod } from '@/lib/validacion';

export async function POST(request: Request) {
  const usuario = await usuarioActual();
  if (!usuario) return NextResponse.json({ error: 'Entrá para crear un partido.' }, { status: 401 });

  const cuerpo = await request.json().catch(() => null);
  const datos = esquemaPartido.safeParse(cuerpo);
  if (!datos.success) {
    return NextResponse.json(
      { error: 'Revisá los datos marcados.', detalles: erroresDeZod(datos.error) },
      { status: 400 }
    );
  }
  const d = datos.data;

  const deporte = await prisma.deporte.findUnique({ where: { id: d.deporteId } });
  if (!deporte) return NextResponse.json({ error: 'Ese deporte no existe.' }, { status: 400 });

  const partido = await prisma.partido.create({
    data: {
      deporteId: deporte.id,
      organizadorId: usuario.id,
      fecha: d.fecha,
      recurrenteSemanal: d.recurrenteSemanal,
      lugarNombre: d.lugarNombre,
      direccion: d.direccion ?? null,
      ciudad: d.ciudad ?? usuario.ciudad,
      provincia: d.provincia ?? usuario.provincia,
      cupo: d.cupo,
      minimo: d.minimo,
      costoPorJugador: d.costoPorJugador ?? null,
      visibilidad: d.visibilidad,
      // El organizador ocupa el primer lugar, confirmado.
      participaciones: { create: { usuarioId: usuario.id, estado: 'VOY' } },
    },
  });

  return NextResponse.json({ id: partido.id }, { status: 201 });
}
