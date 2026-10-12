import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { usuarioActual } from '@/lib/auth';
import { esquemaResultado, erroresDeZod } from '@/lib/validacion';
import { avanzarCopa } from '@/lib/torneos';

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

  const { golesLocal, golesVisitante } = datos.data;
  const empate = golesLocal === golesVisitante;
  if (torneo.formato === 'COPA') {
    const { penalesLocal, penalesVisitante } = datos.data;
    if (empate && (penalesLocal == null || penalesVisitante == null || penalesLocal === penalesVisitante)) {
      return NextResponse.json({ error: 'Empataron: cargá los penales (alguien tiene que pasar).' }, { status: 400 });
    }
    // Con la ronda siguiente ya armada, cambiar quién pasó desarmaría el cuadro.
    const despues = await prisma.partidoTorneo.count({ where: { torneoId: id, ronda: { gt: partido.ronda } } });
    if (despues > 0) {
      return NextResponse.json({ error: 'La ronda siguiente ya se armó: este resultado no se puede cambiar.' }, { status: 409 });
    }
  }

  await prisma.partidoTorneo.update({
    where: { id: partido.id },
    data: {
      golesLocal,
      golesVisitante,
      penalesLocal: torneo.formato === 'COPA' && empate ? datos.data.penalesLocal : null,
      penalesVisitante: torneo.formato === 'COPA' && empate ? datos.data.penalesVisitante : null,
      jugadoEn: new Date(),
    },
  });

  // Copa: completa la ronda, se arma la siguiente; con la final jugada, hay campeón.
  if (torneo.formato === 'COPA' && torneo.cuadro) {
    const partidos = await prisma.partidoTorneo.findMany({ where: { torneoId: id } });
    const { crear, campeonId } = avanzarCopa(JSON.parse(torneo.cuadro), partidos);
    if (crear.length > 0) {
      await prisma.partidoTorneo.createMany({ data: crear.map((cruce) => ({ torneoId: id, ...cruce })) });
    }
    if (campeonId) await prisma.torneo.update({ where: { id }, data: { estado: 'TERMINADO' } });
  }

  return NextResponse.json({ listo: true });
}
