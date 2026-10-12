import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { usuarioActual } from '@/lib/auth';

const esquema = z.object({ usuarioId: z.string().min(1), pago: z.boolean() });

/**
 * Marcar quién pagó su parte. La plata se arregla entre ellos (no pasa por
 * birteam): esto es solo la cuenta del organizador. Organiza o co-organiza.
 */
export async function POST(request: Request, contexto: { params: Promise<{ id: string }> }) {
  const usuario = await usuarioActual();
  if (!usuario) return NextResponse.json({ error: 'Entrá primero.' }, { status: 401 });

  const { id } = await contexto.params;
  const datos = esquema.safeParse(await request.json().catch(() => null));
  if (!datos.success) return NextResponse.json({ error: 'Pedido inválido.' }, { status: 400 });

  const partido = await prisma.partido.findUnique({
    where: { id },
    select: { organizadorId: true, coOrganizadorId: true, estado: true, costoPorJugador: true },
  });
  if (!partido) return NextResponse.json({ error: 'Ese partido no existe.' }, { status: 404 });
  if (partido.organizadorId !== usuario.id && partido.coOrganizadorId !== usuario.id) {
    return NextResponse.json({ error: 'Los pagos los marca quien organiza.' }, { status: 403 });
  }
  if (!partido.costoPorJugador) {
    return NextResponse.json({ error: 'Este partido no tiene costo por jugador.' }, { status: 400 });
  }
  if (partido.estado === 'CANCELADO') {
    return NextResponse.json({ error: 'El partido está cancelado.' }, { status: 409 });
  }

  const { count } = await prisma.participacion.updateMany({
    where: { partidoId: id, usuarioId: datos.data.usuarioId, estado: 'VOY' },
    data: { pago: datos.data.pago },
  });
  if (count === 0) {
    return NextResponse.json({ error: 'Esa persona no está entre los confirmados.' }, { status: 400 });
  }
  return NextResponse.json({ listo: true });
}
