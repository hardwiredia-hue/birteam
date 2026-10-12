import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { usuarioActual } from '@/lib/auth';
import { armarEquipos, puntajeDeNivel } from '@/lib/equipos';

async function partidoDelOrganizador(id: string, usuarioId: string) {
  const partido = await prisma.partido.findUnique({ where: { id } });
  if (!partido) return { error: NextResponse.json({ error: 'Ese partido no existe.' }, { status: 404 }) };
  if (partido.organizadorId !== usuarioId && partido.coOrganizadorId !== usuarioId) {
    return { error: NextResponse.json({ error: 'Los equipos los arma quien organiza.' }, { status: 403 }) };
  }
  if (partido.estado === 'CANCELADO') {
    return { error: NextResponse.json({ error: 'El partido está cancelado.' }, { status: 409 }) };
  }
  return { partido };
}

/** Armar los equipos con los confirmados: parejos (por nivel) o mezclados. */
export async function POST(request: Request, contexto: { params: Promise<{ id: string }> }) {
  const usuario = await usuarioActual();
  if (!usuario) return NextResponse.json({ error: 'Entrá primero.' }, { status: 401 });
  const { id } = await contexto.params;
  const { partido, error } = await partidoDelOrganizador(id, usuario.id);
  if (error) return error;

  const cuerpo = await request.json().catch(() => ({}));
  const modo = cuerpo?.modo === 'mezclar' ? 'mezclar' : 'parejos';
  const confirmados = await prisma.participacion.findMany({
    where: { partidoId: partido.id, estado: 'VOY' },
    select: { id: true, usuarioId: true },
  });
  if (confirmados.length < 2) {
    return NextResponse.json({ error: 'Hacen falta al menos 2 confirmados.' }, { status: 409 });
  }
  const niveles = await prisma.usuarioDeporte.findMany({
    where: { deporteId: partido.deporteId, usuarioId: { in: confirmados.map((c) => c.usuarioId) } },
    select: { usuarioId: true, nivel: true },
  });
  const asignacion = armarEquipos(
    confirmados.map((c) => ({
      id: c.id,
      puntaje: puntajeDeNivel(niveles.find((n) => n.usuarioId === c.usuarioId)?.nivel),
    })),
    modo
  );
  await prisma.$transaction([
    // Los que ya no van quedan sin equipo.
    prisma.participacion.updateMany({ where: { partidoId: partido.id, estado: { not: 'VOY' } }, data: { equipo: null } }),
    ...[...asignacion].map(([participacionId, equipo]) =>
      prisma.participacion.update({ where: { id: participacionId }, data: { equipo } })
    ),
  ]);
  return NextResponse.json({ listo: true });
}

/** Pasar a un jugador al otro equipo (o sacarlo). */
export async function PATCH(request: Request, contexto: { params: Promise<{ id: string }> }) {
  const usuario = await usuarioActual();
  if (!usuario) return NextResponse.json({ error: 'Entrá primero.' }, { status: 401 });
  const { id } = await contexto.params;
  const { partido, error } = await partidoDelOrganizador(id, usuario.id);
  if (error) return error;
  const cuerpo = await request.json().catch(() => ({}));
  const equipo = cuerpo?.equipo === 1 || cuerpo?.equipo === 2 ? cuerpo.equipo : null;
  const { count } = await prisma.participacion.updateMany({
    where: { partidoId: partido.id, usuarioId: String(cuerpo?.usuarioId ?? ''), estado: 'VOY' },
    data: { equipo },
  });
  if (count === 0) return NextResponse.json({ error: 'Ese jugador no está confirmado.' }, { status: 404 });
  return NextResponse.json({ listo: true });
}

/** Deshacer los equipos. */
export async function DELETE(_request: Request, contexto: { params: Promise<{ id: string }> }) {
  const usuario = await usuarioActual();
  if (!usuario) return NextResponse.json({ error: 'Entrá primero.' }, { status: 401 });
  const { id } = await contexto.params;
  const { partido, error } = await partidoDelOrganizador(id, usuario.id);
  if (error) return error;
  await prisma.participacion.updateMany({ where: { partidoId: partido.id }, data: { equipo: null } });
  return NextResponse.json({ listo: true });
}
