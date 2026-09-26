import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { usuarioActual } from '@/lib/auth';
import { esquemaRsvp, erroresDeZod } from '@/lib/validacion';

/**
 * Cambia tu estado en un partido: VOY / TALVEZ / NOVOY.
 *
 * Reglas (ESQUEMA.md §3.5):
 * - VOY con cupo lleno → entrás a la lista de ESPERA, numerado.
 * - Si un confirmado se baja, sube el 1º de la espera y se le avisa.
 *   (La invitación con vencimiento de 2 h llega con las notificaciones push;
 *   por ahora la promoción es directa.)
 * - El partido pasa a CONFIRMADO al llegar al mínimo, y vuelve a ARMANDOSE
 *   si baja de ahí.
 */
export async function POST(request: Request, contexto: { params: Promise<{ id: string }> }) {
  const usuario = await usuarioActual();
  if (!usuario) return NextResponse.json({ error: 'Entrá para confirmar.' }, { status: 401 });

  const { id } = await contexto.params;
  const cuerpo = await request.json().catch(() => null);
  const datos = esquemaRsvp.safeParse(cuerpo);
  if (!datos.success) {
    return NextResponse.json(
      { error: 'Revisá los datos.', detalles: erroresDeZod(datos.error) },
      { status: 400 }
    );
  }
  const pedido = datos.data.estado;

  const resultado = await prisma.$transaction(async (tx) => {
    const partido = await tx.partido.findUnique({
      where: { id },
      include: { participaciones: true },
    });
    if (!partido) return { error: 'Ese partido no existe.', status: 404 as const };
    if (partido.estado === 'CANCELADO' || partido.estado === 'JUGADO') {
      return { error: 'Ese partido ya no acepta cambios.', status: 409 as const };
    }

    const mia = partido.participaciones.find((p) => p.usuarioId === usuario.id);
    const confirmados = partido.participaciones.filter(
      (p) => p.estado === 'VOY' && p.usuarioId !== usuario.id
    ).length;

    let estadoFinal: string = pedido;
    let ordenEspera: number | null = null;

    if (pedido === 'VOY' && confirmados >= partido.cupo) {
      // Cupo lleno: a la lista de espera, atrás de los que ya están.
      const ultimo = Math.max(
        0,
        ...partido.participaciones
          .filter((p) => p.estado === 'ESPERA' && p.usuarioId !== usuario.id)
          .map((p) => p.ordenEspera ?? 0)
      );
      estadoFinal = 'ESPERA';
      ordenEspera = ultimo + 1;
    }

    await tx.participacion.upsert({
      where: { partidoId_usuarioId: { partidoId: partido.id, usuarioId: usuario.id } },
      update: { estado: estadoFinal, ordenEspera },
      create: { partidoId: partido.id, usuarioId: usuario.id, estado: estadoFinal, ordenEspera },
    });

    // Si dejé un lugar libre, sube el primero de la espera.
    const dejeLugar = mia?.estado === 'VOY' && estadoFinal !== 'VOY';
    if (dejeLugar) {
      const primero = await tx.participacion.findFirst({
        where: { partidoId: partido.id, estado: 'ESPERA', NOT: { usuarioId: usuario.id } },
        orderBy: { ordenEspera: 'asc' },
      });
      if (primero) {
        await tx.participacion.update({
          where: { id: primero.id },
          data: { estado: 'VOY', ordenEspera: null },
        });
        await tx.notificacion.create({
          data: {
            usuarioId: primero.usuarioId,
            tipo: 'LUGAR_LIBERADO',
            titulo: 'Se liberó un lugar y entraste al partido',
            cuerpo: `Quedaste confirmado. Si no podés ir, avisá cuanto antes.`,
            url: `/partidos/${partido.id}`,
          },
        });
      }
    }

    // Recalcular el estado del partido según el mínimo.
    const voyAhora = await tx.participacion.count({
      where: { partidoId: partido.id, estado: 'VOY' },
    });
    const estadoPartido = voyAhora >= partido.minimo ? 'CONFIRMADO' : 'ARMANDOSE';
    if (estadoPartido !== partido.estado) {
      await tx.partido.update({ where: { id: partido.id }, data: { estado: estadoPartido } });
    }

    return { estado: estadoFinal, ordenEspera, status: 200 as const };
  });

  if ('error' in resultado) {
    return NextResponse.json({ error: resultado.error }, { status: resultado.status });
  }
  return NextResponse.json(resultado);
}
