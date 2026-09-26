import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { usuarioActual } from '@/lib/auth';
import { esquemaTorneo, erroresDeZod } from '@/lib/validacion';

export async function POST(request: Request) {
  const usuario = await usuarioActual();
  if (!usuario) return NextResponse.json({ error: 'Entrá para crear un torneo.' }, { status: 401 });

  const cuerpo = await request.json().catch(() => null);
  const datos = esquemaTorneo.safeParse(cuerpo);
  if (!datos.success) {
    return NextResponse.json(
      { error: 'Revisá los datos marcados.', detalles: erroresDeZod(datos.error) },
      { status: 400 }
    );
  }
  const d = datos.data;

  const deporte = await prisma.deporte.findUnique({ where: { id: d.deporteId } });
  if (!deporte) return NextResponse.json({ error: 'Ese deporte no existe.' }, { status: 400 });

  const torneo = await prisma.torneo.create({
    data: {
      nombre: d.nombre,
      descripcion: d.descripcion ?? null,
      deporteId: deporte.id,
      organizadorId: usuario.id,
      ciudad: usuario.ciudad,
      provincia: usuario.provincia,
      maxEquipos: d.maxEquipos,
    },
  });

  return NextResponse.json({ id: torneo.id }, { status: 201 });
}
