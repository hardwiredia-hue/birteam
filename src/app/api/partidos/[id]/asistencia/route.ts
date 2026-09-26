import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { usuarioActual } from '@/lib/auth';
import { esquemaAsistencia, erroresDeZod } from '@/lib/validacion';

/**
 * Pasar lista después del partido: quién vino, resultado opcional, y el
 * partido queda JUGADO. Solo el organizador (o co-organizador). Esto
 * alimenta el % de asistencia del perfil (ESQUEMA.md §3.4).
 */
export async function POST(request: Request, contexto: { params: Promise<{ id: string }> }) {
  const usuario = await usuarioActual();
  if (!usuario) return NextResponse.json({ error: 'Entrá primero.' }, { status: 401 });

  const { id } = await contexto.params;
  const cuerpo = await request.json().catch(() => null);
  const datos = esquemaAsistencia.safeParse(cuerpo);
  if (!datos.success) {
    return NextResponse.json(
      { error: 'Revisá los datos.', detalles: erroresDeZod(datos.error) },
      { status: 400 }
    );
  }

  const partido = await prisma.partido.findUnique({
    where: { id },
    select: { id: true, organizadorId: true, coOrganizadorId: true, estado: true, fecha: true },
  });
  if (!partido) return NextResponse.json({ error: 'Ese partido no existe.' }, { status: 404 });
  if (partido.organizadorId !== usuario.id && partido.coOrganizadorId !== usuario.id) {
    return NextResponse.json({ error: 'La lista la pasa quien organiza.' }, { status: 403 });
  }
  if (partido.estado === 'CANCELADO') {
    return NextResponse.json({ error: 'El partido está cancelado.' }, { status: 409 });
  }
  if (partido.fecha > new Date()) {
    return NextResponse.json({ error: 'La lista se pasa cuando el partido ya se jugó.' }, { status: 409 });
  }

  await prisma.$transaction(async (tx) => {
    for (const marca of datos.data.asistencias) {
      await tx.participacion.updateMany({
        where: { partidoId: partido.id, usuarioId: marca.usuarioId, estado: 'VOY' },
        data: { asistio: marca.asistio },
      });
    }
    await tx.partido.update({
      where: { id: partido.id },
      data: { estado: 'JUGADO', resultado: datos.data.resultado ?? null },
    });
  });

  return NextResponse.json({ listo: true });
}
