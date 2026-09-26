import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { usuarioActual } from '@/lib/auth';

/** Cierra el torneo. Solo cuando está todo jugado, así la tabla es honesta. */
export async function POST(_request: Request, contexto: { params: Promise<{ id: string }> }) {
  const usuario = await usuarioActual();
  if (!usuario) return NextResponse.json({ error: 'Entrá primero.' }, { status: 401 });

  const { id } = await contexto.params;
  const torneo = await prisma.torneo.findUnique({ where: { id }, include: { partidos: true } });
  if (!torneo) return NextResponse.json({ error: 'Ese torneo no existe.' }, { status: 404 });
  if (torneo.organizadorId !== usuario.id) {
    return NextResponse.json({ error: 'El torneo lo cierra quien lo organiza.' }, { status: 403 });
  }
  if (torneo.estado !== 'EN_JUEGO') {
    return NextResponse.json({ error: 'Este torneo no está en juego.' }, { status: 409 });
  }
  const pendientes = torneo.partidos.filter((partido) => partido.golesLocal === null).length;
  if (pendientes > 0) {
    return NextResponse.json(
      { error: `Faltan cargar ${pendientes} resultados para poder cerrarlo.` },
      { status: 409 }
    );
  }

  await prisma.torneo.update({ where: { id }, data: { estado: 'TERMINADO' } });
  return NextResponse.json({ listo: true });
}
