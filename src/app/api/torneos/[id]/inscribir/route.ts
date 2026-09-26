import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { usuarioActual } from '@/lib/auth';
import { esquemaEquipoTorneo, erroresDeZod } from '@/lib/validacion';

/** Anotar tu equipo en un torneo en inscripción. Un equipo por capitán. */
export async function POST(request: Request, contexto: { params: Promise<{ id: string }> }) {
  const usuario = await usuarioActual();
  if (!usuario) return NextResponse.json({ error: 'Entrá para anotarte.' }, { status: 401 });

  const { id } = await contexto.params;
  const cuerpo = await request.json().catch(() => null);
  const datos = esquemaEquipoTorneo.safeParse(cuerpo);
  if (!datos.success) {
    return NextResponse.json(
      { error: 'Revisá los datos.', detalles: erroresDeZod(datos.error) },
      { status: 400 }
    );
  }

  const torneo = await prisma.torneo.findUnique({
    where: { id },
    include: { _count: { select: { equipos: true } }, equipos: { where: { capitanId: usuario.id } } },
  });
  if (!torneo) return NextResponse.json({ error: 'Ese torneo no existe.' }, { status: 404 });
  if (torneo.estado !== 'INSCRIPCION') {
    return NextResponse.json({ error: 'La inscripción de este torneo ya cerró.' }, { status: 409 });
  }
  if (torneo.equipos.length > 0) {
    return NextResponse.json({ error: 'Ya tenés un equipo anotado en este torneo.' }, { status: 409 });
  }
  if (torneo._count.equipos >= torneo.maxEquipos) {
    return NextResponse.json({ error: 'El torneo está completo.' }, { status: 409 });
  }

  const existente = await prisma.equipoTorneo.findUnique({
    where: { torneoId_nombre: { torneoId: id, nombre: datos.data.nombre } },
  });
  if (existente) {
    return NextResponse.json({ error: 'Ya hay un equipo con ese nombre. Probá con otro.' }, { status: 409 });
  }

  const equipo = await prisma.equipoTorneo.create({
    data: { torneoId: id, nombre: datos.data.nombre, capitanId: usuario.id },
  });
  return NextResponse.json({ id: equipo.id }, { status: 201 });
}
