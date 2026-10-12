import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { usuarioActual } from '@/lib/auth';
import { estadoVotacion, jugaron } from '@/lib/figura';

/** Votar (o cambiar el voto de) la figura del partido. */
export async function POST(request: Request, contexto: { params: Promise<{ id: string }> }) {
  const usuario = await usuarioActual();
  if (!usuario) return NextResponse.json({ error: 'Entrá primero.' }, { status: 401 });
  const { id } = await contexto.params;
  const partido = await prisma.partido.findUnique({
    where: { id },
    include: { participaciones: { select: { usuarioId: true, estado: true, asistio: true } } },
  });
  if (!partido) return NextResponse.json({ error: 'Ese partido no existe.' }, { status: 404 });

  const estado = estadoVotacion(partido);
  if (estado !== 'ABIERTA') {
    return NextResponse.json(
      { error: estado === 'NO_EMPEZO' ? 'Se vota cuando termina el partido.' : 'La votación ya cerró.' },
      { status: 409 }
    );
  }
  const habilitados = jugaron(partido.participaciones).map((p) => p.usuarioId);
  if (!habilitados.includes(usuario.id)) {
    return NextResponse.json({ error: 'Votan los que jugaron.' }, { status: 403 });
  }
  const cuerpo = await request.json().catch(() => ({}));
  const elegidoId = String(cuerpo?.elegidoId ?? '');
  if (elegidoId === usuario.id) return NextResponse.json({ error: 'No vale votarse a uno mismo.' }, { status: 400 });
  if (!habilitados.includes(elegidoId)) {
    return NextResponse.json({ error: 'Elegí a alguien que jugó.' }, { status: 400 });
  }

  await prisma.votoFigura.upsert({
    where: { partidoId_votanteId: { partidoId: partido.id, votanteId: usuario.id } },
    create: { partidoId: partido.id, votanteId: usuario.id, elegidoId },
    update: { elegidoId },
  });
  return NextResponse.json({ listo: true });
}
