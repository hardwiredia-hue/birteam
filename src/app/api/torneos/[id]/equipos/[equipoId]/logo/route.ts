import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { usuarioActual } from '@/lib/auth';
import { esquemaLogo, erroresDeZod } from '@/lib/validacion';

/** Poner o sacar el logo de un equipo del torneo: su capitán o quien organiza. */
export async function PUT(request: Request, contexto: { params: Promise<{ id: string; equipoId: string }> }) {
  const usuario = await usuarioActual();
  if (!usuario) return NextResponse.json({ error: 'Entrá primero.' }, { status: 401 });
  const { id, equipoId } = await contexto.params;
  const equipo = await prisma.equipoTorneo.findFirst({
    where: { id: equipoId, torneoId: id },
    include: { torneo: { select: { organizadorId: true } } },
  });
  if (!equipo) return NextResponse.json({ error: 'Ese equipo no existe.' }, { status: 404 });
  if (equipo.capitanId !== usuario.id && equipo.torneo.organizadorId !== usuario.id) {
    return NextResponse.json({ error: 'El logo lo cambia el capitán del equipo.' }, { status: 403 });
  }
  const datos = esquemaLogo.safeParse(await request.json().catch(() => null));
  if (!datos.success) {
    return NextResponse.json({ error: 'Revisá la imagen.', detalles: erroresDeZod(datos.error) }, { status: 400 });
  }
  await prisma.equipoTorneo.update({
    where: { id: equipo.id },
    data: { logoUrl: datos.data.logo ? `/api/archivos/${datos.data.logo}` : null },
  });
  return NextResponse.json({ listo: true });
}
