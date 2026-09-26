import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { usuarioActual } from '@/lib/auth';
import { ofrecerLugarLibre } from '@/lib/espera';
import { esquemaRsvp, erroresDeZod } from '@/lib/validacion';

/**
 * Cambia tu estado en un partido: VOY / TALVEZ / NOVOY.
 *
 * Reglas (ESQUEMA.md §3.5):
 * - VOY con cupo lleno → lista de ESPERA, numerada. Los lugares reservados
 *   (invitación vigente de 2 h) también cuentan como ocupados: nadie le
 *   gana el lugar al que tiene la invitación en la mano.
 * - Si un confirmado se baja, el lugar se le OFRECE al 1º de la espera con
 *   2 h para confirmar; si no contesta, la tarea programada pasa al
 *   siguiente (/api/tareas).
 * - El partido pasa a CONFIRMADO al llegar al mínimo y vuelve a ARMANDOSE
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

    const ahora = new Date();
    const mia = partido.participaciones.find((p) => p.usuarioId === usuario.id);
    // Ocupados de verdad: confirmados + lugares reservados por invitación
    // vigente. Siempre sin contarme a mí (mi propio lugar no me bloquea).
    const otros = partido.participaciones.filter((p) => p.usuarioId !== usuario.id);
    const ocupados =
      otros.filter((p) => p.estado === 'VOY').length +
      otros.filter(
        (p) => p.estado === 'ESPERA' && p.invitacionExpiraEn && p.invitacionExpiraEn > ahora
      ).length;

    let estadoFinal: string = pedido;
    let ordenEspera: number | null = null;

    if (pedido === 'VOY' && ocupados >= partido.cupo) {
      // Cupo lleno: a la lista de espera, atrás de los que ya están.
      const ultimo = Math.max(
        0,
        ...otros.filter((p) => p.estado === 'ESPERA').map((p) => p.ordenEspera ?? 0)
      );
      estadoFinal = 'ESPERA';
      ordenEspera = mia?.estado === 'ESPERA' ? (mia.ordenEspera ?? ultimo + 1) : ultimo + 1;
    }

    await tx.participacion.upsert({
      where: { partidoId_usuarioId: { partidoId: partido.id, usuarioId: usuario.id } },
      update: { estado: estadoFinal, ordenEspera, invitacionExpiraEn: null },
      create: { partidoId: partido.id, usuarioId: usuario.id, estado: estadoFinal, ordenEspera },
    });

    // Cualquier cambio puede haber liberado un lugar (me bajé de VOY, o
    // solté una invitación reservada): ofrecérselo al primero de la lista.
    // La función controla sola si de verdad hay lugar.
    if (estadoFinal !== 'VOY') await ofrecerLugarLibre(tx, partido.id);

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
