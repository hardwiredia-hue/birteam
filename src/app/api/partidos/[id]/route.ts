import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { usuarioActual } from '@/lib/auth';
import { esquemaEditarPartido, erroresDeZod } from '@/lib/validacion';
import { enviarPush } from '@/lib/push';
import { coordenadasDelLugar } from '@/lib/coordenadas';
import { deportesCompatibles } from '@/lib/lugares';
import { ESTADOS_ACTIVOS } from '@/lib/reservas';

/** Editar el partido. Solo organiza/co-organiza, mientras no esté cerrado. */
export async function PATCH(request: Request, contexto: { params: Promise<{ id: string }> }) {
  const usuario = await usuarioActual();
  if (!usuario) return NextResponse.json({ error: 'Entrá primero.' }, { status: 401 });

  const { id } = await contexto.params;
  const cuerpo = await request.json().catch(() => null);
  const datos = esquemaEditarPartido.safeParse(cuerpo);
  if (!datos.success) {
    return NextResponse.json(
      { error: 'Revisá los datos marcados.', detalles: erroresDeZod(datos.error) },
      { status: 400 }
    );
  }
  const d = datos.data;

  const partido = await prisma.partido.findUnique({
    where: { id },
    include: { deporte: true, participaciones: true },
  });
  if (!partido) return NextResponse.json({ error: 'Ese partido no existe.' }, { status: 404 });
  if (partido.organizadorId !== usuario.id && partido.coOrganizadorId !== usuario.id) {
    return NextResponse.json({ error: 'El partido lo edita quien organiza.' }, { status: 403 });
  }
  if (partido.estado === 'JUGADO' || partido.estado === 'CANCELADO') {
    return NextResponse.json({ error: 'Ese partido ya no se puede editar.' }, { status: 409 });
  }

  const confirmados = partido.participaciones.filter((p) => p.estado === 'VOY').length;
  if (d.cupo < confirmados) {
    return NextResponse.json(
      { error: `Ya hay ${confirmados} confirmados: el cupo no puede ser menor.`, detalles: { cupo: [`Mínimo ${confirmados}.`] } },
      { status: 400 }
    );
  }
  if (d.minimo > d.cupo) {
    return NextResponse.json(
      { error: 'El mínimo no puede superar el cupo.', detalles: { minimo: ['Bajalo al cupo o menos.'] } },
      { status: 400 }
    );
  }

  // Cambio de cancha: la nueva tiene que estar publicada y ser del deporte; si
  // hay un turno reservado en la actual, primero hay que cancelarlo.
  const canchaNueva = d.canchaId === undefined ? partido.canchaId : d.canchaId;
  const cambiaCancha = canchaNueva !== partido.canchaId;
  let ubicacion: { latitud: number; longitud: number } | null = null;
  if (cambiaCancha) {
    if (canchaNueva) {
      const cancha = await prisma.cancha.findUnique({ where: { id: canchaNueva } });
      if (!cancha || !cancha.activa) {
        return NextResponse.json({ error: 'Esa cancha ya no está publicada.' }, { status: 400 });
      }
      if (!(await deportesCompatibles(partido.deporteId)).includes(cancha.deporteId)) {
        return NextResponse.json({ error: `Esa cancha no es para ${partido.deporte.nombre}. Elegí otra.` }, { status: 400 });
      }
    }
    const turno = partido.canchaId
      ? await prisma.reserva.findFirst({
          where: { partidoId: partido.id, estado: { in: ESTADOS_ACTIVOS }, inicio: { gt: new Date() } },
          include: { cancha: { select: { nombre: true } } },
        })
      : null;
    if (turno) {
      return NextResponse.json(
        {
          error: `Este partido tiene un turno reservado en ${turno.cancha.nombre}. Cancelalo desde Reservas antes de cambiar de cancha.`,
        },
        { status: 409 }
      );
    }
    ubicacion = await coordenadasDelLugar({ canchaId: canchaNueva, ciudad: partido.ciudad, provincia: partido.provincia });
  }

  const cambioClave =
    partido.fecha.getTime() !== d.fecha.getTime() || partido.lugarNombre !== d.lugarNombre || cambiaCancha;

  await prisma.partido.update({
    where: { id },
    data: {
      fecha: d.fecha,
      lugarNombre: d.lugarNombre,
      ...(cambiaCancha
        ? { canchaId: canchaNueva, latitud: ubicacion?.latitud ?? null, longitud: ubicacion?.longitud ?? null }
        : {}),
      direccion: d.direccion ?? null,
      lugarTelefono: d.lugarTelefono ?? null,
      cupo: d.cupo,
      minimo: d.minimo,
      costoPorJugador: d.costoPorJugador ?? null,
      visibilidad: d.visibilidad,
      recurrenteSemanal: d.recurrenteSemanal,
    },
  });

  // Cambió el día, la hora o la cancha: todos los anotados se enteran.
  if (cambioClave) {
    const hora = d.fecha.toLocaleTimeString('es-AR', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Argentina/Buenos_Aires',
    });
    const dia = d.fecha.toLocaleDateString('es-AR', {
      weekday: 'long',
      timeZone: 'America/Argentina/Buenos_Aires',
    });
    const avisar = partido.participaciones.filter((p) => p.usuarioId !== usuario.id);
    if (avisar.length > 0) {
      await prisma.notificacion.createMany({
        data: avisar.map((p) => ({
          usuarioId: p.usuarioId,
          tipo: 'PARTIDO_CAMBIO',
          titulo: `Cambió el ${partido.deporte.nombre}: ${dia} ${hora}`,
          cuerpo: `Ahora es en ${d.lugarNombre}. Fijate si te sigue quedando bien.`,
          url: `/partidos/${partido.id}`,
        })),
      });
      await enviarPush(
        avisar.map((p) => p.usuarioId),
        {
          titulo: `Cambió el ${partido.deporte.nombre}: ${dia} ${hora}`,
          cuerpo: `Ahora es en ${d.lugarNombre}. Fijate si te sigue quedando bien.`,
          url: `/partidos/${partido.id}`,
        }
      );
    }
  }

  return NextResponse.json({ listo: true });
}
