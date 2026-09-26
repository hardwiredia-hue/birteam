import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { usuarioActual } from '@/lib/auth';
import { esquemaResultado, erroresDeZod } from '@/lib/validacion';

/** Carga (o corrige) el resultado de un partido del torneo. Solo organiza. */
export async function POST(request: Request, contexto: { params: Promise<{ id: string }> }) {
  const usuario = await usuarioActual();
  if (!usuario) return NextResponse.json({ error: 'Entrá primero.' }, { status: 401 });

  const { id } = await contexto.params;
  const cuerpo = await request.json().catch(() => null);
  const datos = esquemaResultado.safeParse(cuerpo);
  if (!datos.success) {
    return NextResponse.json(
      { error: 'Revisá el resultado.', detalles: erroresDeZod(datos.error) },
      { status: 400 }
    );
  }

  const torneo = await prisma.torneo.findUnique({ where: { id } });
  if (!torneo) return NextResponse.json({ error: 'Ese torneo no existe.' }, { status: 404 });
  if (torneo.organizadorId !== usuario.id) {
    return NextResponse.json({ error: 'Los resultados los carga quien organiza.' }, { status: 403 });
  }
  if (torneo.estado !== 'EN_JUEGO') {
    return NextResponse.json({ error: 'Este torneo no está en juego.' }, { status: 409 });
  }

  const partido = await prisma.partidoTorneo.findUnique({
    where: { id: datos.data.partidoTorneoId },
  });
  if (!partido || partido.torneoId !== id) {
    return NextResponse.json({ error: 'Ese partido no es de este torneo.' }, { status: 404 });
  }

  await prisma.partidoTorneo.update({
    where: { id: partido.id },
    data: {
      golesLocal: datos.data.golesLocal,
      golesVisitante: datos.data.golesVisitante,
      jugadoEn: new Date(),
    },
  });

  return NextResponse.json({ listo: true });
}
