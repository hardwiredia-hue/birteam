import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { usuarioActual } from '@/lib/auth';
import { esquemaPartido, erroresDeZod } from '@/lib/validacion';
import { enviarPush } from '@/lib/push';
import { idsBloqueados } from '@/lib/bloqueos';

export async function POST(request: Request) {
  const usuario = await usuarioActual();
  if (!usuario) return NextResponse.json({ error: 'Entrá para crear un partido.' }, { status: 401 });

  const cuerpo = await request.json().catch(() => null);
  const datos = esquemaPartido.safeParse(cuerpo);
  if (!datos.success) {
    return NextResponse.json(
      { error: 'Revisá los datos marcados.', detalles: erroresDeZod(datos.error) },
      { status: 400 }
    );
  }
  const d = datos.data;

  const deporte = await prisma.deporte.findUnique({ where: { id: d.deporteId } });
  if (!deporte) return NextResponse.json({ error: 'Ese deporte no existe.' }, { status: 400 });

  // Sede en una cancha publicada: tiene que existir, estar activa y abrir ese día.
  let canchaId: string | null = null;
  if (d.canchaId) {
    const cancha = await prisma.cancha.findUnique({ where: { id: d.canchaId } });
    if (!cancha || !cancha.activa) {
      return NextResponse.json({ error: 'Esa cancha ya no está publicada.' }, { status: 400 });
    }
    let dias: number[] = [0, 1, 2, 3, 4, 5, 6];
    try {
      dias = JSON.parse(cancha.diasDisponibles);
    } catch {
      dias = [0, 1, 2, 3, 4, 5, 6];
    }
    // El día se evalúa en hora argentina: a las 21 acá ya es "mañana" en UTC.
    const rotuloDia = d.fecha.toLocaleDateString('en-US', {
      weekday: 'short',
      timeZone: 'America/Argentina/Buenos_Aires',
    });
    const diaLocal = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }[rotuloDia] ?? d.fecha.getDay();
    if (!dias.includes(diaLocal)) {
      return NextResponse.json(
        { error: 'La cancha no está disponible ese día. Elegí otro en el almanaque.' },
        { status: 400 }
      );
    }
    canchaId = cancha.id;
  }

  // Partido de grupo: solo si sos miembro.
  let miembrosDelGrupo: { usuarioId: string }[] = [];
  if (d.grupoId) {
    const miembros = await prisma.miembroGrupo.findMany({
      where: { grupoId: d.grupoId },
      select: { usuarioId: true },
    });
    if (!miembros.some((miembro) => miembro.usuarioId === usuario.id)) {
      return NextResponse.json({ error: 'No sos miembro de ese grupo.' }, { status: 403 });
    }
    miembrosDelGrupo = miembros;
  }

  const partido = await prisma.partido.create({
    data: {
      deporteId: deporte.id,
      grupoId: d.grupoId ?? null,
      organizadorId: usuario.id,
      fecha: d.fecha,
      recurrenteSemanal: d.recurrenteSemanal,
      lugarNombre: d.lugarNombre,
      direccion: d.direccion ?? null,
      lugarTelefono: d.lugarTelefono ?? null,
      canchaId,
      ciudad: d.ciudad ?? usuario.ciudad,
      provincia: d.provincia ?? usuario.provincia,
      cupo: d.cupo,
      minimo: d.minimo,
      costoPorJugador: d.costoPorJugador ?? null,
      visibilidad: d.visibilidad,
      // El organizador ocupa el primer lugar, confirmado.
      participaciones: { create: { usuarioId: usuario.id, estado: 'VOY' } },
    },
  });

  // Partido armado sobre un turno confirmado propio: la reserva apunta al partido.
  if (d.reservaId && canchaId) {
    await prisma.reserva.updateMany({
      where: {
        id: d.reservaId,
        usuarioId: usuario.id,
        canchaId,
        estado: 'CONFIRMADA',
        partidoId: null,
      },
      data: { partidoId: partido.id },
    });
  }

  // El lugar queda guardado para la próxima: se elige de una, con su contacto.
  await prisma.lugarGuardado.upsert({
    where: { usuarioId_nombre: { usuarioId: usuario.id, nombre: d.lugarNombre } },
    create: {
      usuarioId: usuario.id,
      nombre: d.lugarNombre,
      direccion: d.direccion ?? null,
      telefono: d.lugarTelefono ?? null,
    },
    update: {
      direccion: d.direccion ?? null,
      telefono: d.lugarTelefono ?? null,
      ultimaVez: new Date(),
    },
  });

  // Invitaciones: los integrantes del grupo + los elegidos a mano, sin repetir.
  let idsElegidos: string[] = [];
  if (d.invitadoIds.length > 0) {
    const ocultos = await idsBloqueados(usuario.id);
    const existentes = await prisma.usuario.findMany({
      where: { id: { in: d.invitadoIds, not: usuario.id, notIn: ocultos } },
      select: { id: true },
    });
    idsElegidos = existentes.map((u) => u.id);
  }
  const paraInvitar = [
    ...new Set([...miembrosDelGrupo.map((m) => m.usuarioId), ...idsElegidos]),
  ].filter((usuarioId) => usuarioId !== usuario.id);
  const invitados = paraInvitar.map((usuarioId) => ({ usuarioId }));
  if (invitados.length > 0) {
    const hora = d.fecha.toLocaleTimeString('es-AR', {
      hour: '2-digit',
    hour12: false,
      minute: '2-digit',
      timeZone: 'America/Argentina/Buenos_Aires',
    });
    const dia = d.fecha.toLocaleDateString('es-AR', {
      weekday: 'long',
      timeZone: 'America/Argentina/Buenos_Aires',
    });
    await prisma.notificacion.createMany({
      data: invitados.map((miembro) => ({
        usuarioId: miembro.usuarioId,
        tipo: 'INVITACION',
        titulo: `Nuevo partido: ${deporte.nombre} el ${dia} ${hora}`,
        cuerpo: `${usuario.nombre} lo armó en ${d.lugarNombre}. Confirmá si vas.`,
        url: `/partidos/${partido.id}`,
      })),
    });
    await enviarPush(
      invitados.map((miembro) => miembro.usuarioId),
      {
        titulo: `Nuevo partido: ${deporte.nombre} el ${dia} ${hora}`,
        cuerpo: `${usuario.nombre} lo armó en ${d.lugarNombre}. Confirmá si vas.`,
        url: `/partidos/${partido.id}`,
      }
    );
  }

  return NextResponse.json({ id: partido.id }, { status: 201 });
}
