import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { usuarioActual } from '@/lib/auth';
import { enviarPush } from '@/lib/push';

/** Nombrar (o quitar, con usuarioId null) al co-organizador. Solo quien organiza. */
export async function POST(request: Request, contexto: { params: Promise<{ id: string }> }) {
  const usuario = await usuarioActual();
  if (!usuario) return NextResponse.json({ error: 'Entrá primero.' }, { status: 401 });

  const { id } = await contexto.params;
  const partido = await prisma.partido.findUnique({
    where: { id },
    include: { deporte: true, participaciones: { where: { estado: 'VOY' } } },
  });
  if (!partido) return NextResponse.json({ error: 'Ese partido no existe.' }, { status: 404 });
  if (partido.organizadorId !== usuario.id) {
    return NextResponse.json({ error: 'Al co-organizador lo nombra quien organiza.' }, { status: 403 });
  }
  if (partido.estado === 'JUGADO' || partido.estado === 'CANCELADO') {
    return NextResponse.json({ error: 'Ese partido ya cerró.' }, { status: 409 });
  }

  const cuerpo = await request.json().catch(() => ({}));
  const usuarioId = cuerpo.usuarioId != null ? String(cuerpo.usuarioId) : null;

  if (usuarioId) {
    if (usuarioId === usuario.id) {
      return NextResponse.json({ error: 'Ya organizás vos.' }, { status: 400 });
    }
    const confirmado = partido.participaciones.some((p) => p.usuarioId === usuarioId);
    if (!confirmado) {
      return NextResponse.json(
        { error: 'El co-organizador tiene que estar entre los confirmados.' },
        { status: 400 }
      );
    }
  }

  await prisma.partido.update({
    where: { id: partido.id },
    data: { coOrganizadorId: usuarioId },
  });

  if (usuarioId) {
    const aviso = {
      titulo: `${usuario.nombre} te hizo co-organizador`,
      cuerpo: `${partido.deporte.nombre} en ${partido.lugarNombre}: ahora podés editar, pasar lista y manejar el partido.`,
      url: `/partidos/${partido.id}`,
    };
    await prisma.notificacion.create({
      data: { usuarioId, tipo: 'COORGANIZADOR', ...aviso },
    });
    await enviarPush(usuarioId, aviso);
  }

  return NextResponse.json({ listo: true });
}
