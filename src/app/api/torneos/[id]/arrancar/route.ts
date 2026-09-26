import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { usuarioActual } from '@/lib/auth';
import { fixtureLiga } from '@/lib/torneos';

/** Cierra la inscripción y genera el fixture (liga, todos contra todos). */
export async function POST(_request: Request, contexto: { params: Promise<{ id: string }> }) {
  const usuario = await usuarioActual();
  if (!usuario) return NextResponse.json({ error: 'Entrá primero.' }, { status: 401 });

  const { id } = await contexto.params;
  const torneo = await prisma.torneo.findUnique({ where: { id }, include: { equipos: true } });
  if (!torneo) return NextResponse.json({ error: 'Ese torneo no existe.' }, { status: 404 });
  if (torneo.organizadorId !== usuario.id) {
    return NextResponse.json({ error: 'El torneo lo arranca quien lo organiza.' }, { status: 403 });
  }
  if (torneo.estado !== 'INSCRIPCION') {
    return NextResponse.json({ error: 'Este torneo ya arrancó.' }, { status: 409 });
  }
  if (torneo.equipos.length < 2) {
    return NextResponse.json({ error: 'Hacen falta al menos 2 equipos.' }, { status: 409 });
  }

  const fixture = fixtureLiga(torneo.equipos.map((equipo) => equipo.id));
  await prisma.$transaction([
    prisma.partidoTorneo.createMany({
      data: fixture.map((partido) => ({ torneoId: id, ...partido })),
    }),
    prisma.torneo.update({ where: { id }, data: { estado: 'EN_JUEGO' } }),
  ]);

  return NextResponse.json({ partidos: fixture.length });
}
