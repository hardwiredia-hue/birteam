import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { quienesQuieren } from '@/lib/avisos';
import { usuarioActual } from '@/lib/auth';
import { erroresDeZod } from '@/lib/validacion';
import { adminsDelGrupo, avisar, rotuloFecha } from '@/lib/desafios';

const esquemaAccion = z.object({
  accion: z.enum(['aceptar', 'rechazar', 'cancelar']),
  // Para aceptar un desafío abierto: con qué grupo.
  grupoId: z.string().nullish(),
});

/**
 * Responder un desafío. Aceptar arma el partido (lo organiza quien desafió)
 * e invita a los miembros de los dos grupos. El cambio de estado va
 * condicionado a PENDIENTE: si dos admins aceptan a la vez, gana uno solo.
 */
export async function PATCH(request: Request, contexto: { params: Promise<{ id: string }> }) {
  const usuario = await usuarioActual();
  if (!usuario) return NextResponse.json({ error: 'Entrá primero.' }, { status: 401 });

  const cuerpo = await request.json().catch(() => null);
  const datos = esquemaAccion.safeParse(cuerpo);
  if (!datos.success) {
    return NextResponse.json(
      { error: 'Revisá los datos.', detalles: erroresDeZod(datos.error) },
      { status: 400 }
    );
  }
  const { accion, grupoId } = datos.data;

  const { id } = await contexto.params;
  const desafio = await prisma.desafio.findUnique({
    where: { id },
    include: { retador: true, rival: true, deporte: true },
  });
  if (!desafio) return NextResponse.json({ error: 'Ese desafío no existe.' }, { status: 404 });
  if (desafio.estado !== 'PENDIENTE') {
    return NextResponse.json({ error: 'Ese desafío ya fue respondido.' }, { status: 409 });
  }

  const adminsRetador = await adminsDelGrupo(desafio.retadorId);

  if (accion === 'cancelar') {
    if (!adminsRetador.includes(usuario.id)) {
      return NextResponse.json({ error: 'Lo cancela un admin del grupo que desafió.' }, { status: 403 });
    }
    await prisma.desafio.updateMany({
      where: { id: desafio.id, estado: 'PENDIENTE' },
      data: { estado: 'CANCELADO', respondidoEn: new Date() },
    });
    return NextResponse.json({ listo: true });
  }

  // Quién responde: el rival elegido, o (desafío abierto) el grupo que acepta.
  const rivalId = desafio.rivalId ?? grupoId ?? null;
  if (!rivalId) {
    return NextResponse.json({ error: 'Elegí con qué grupo aceptás.' }, { status: 400 });
  }
  if (rivalId === desafio.retadorId) {
    return NextResponse.json({ error: 'No podés aceptar tu propio desafío.' }, { status: 400 });
  }
  const rival = desafio.rival ?? (await prisma.grupo.findUnique({ where: { id: rivalId } }));
  if (!rival || rival.deporteId !== desafio.deporteId) {
    return NextResponse.json({ error: 'Ese grupo no puede aceptar este desafío.' }, { status: 400 });
  }
  const adminsRival = await adminsDelGrupo(rival.id);
  if (!adminsRival.includes(usuario.id)) {
    return NextResponse.json({ error: 'Responde un admin del grupo desafiado.' }, { status: 403 });
  }

  if (accion === 'rechazar') {
    if (!desafio.rivalId) {
      return NextResponse.json({ error: 'Un desafío abierto no se rechaza: simplemente no lo aceptes.' }, { status: 400 });
    }
    const { count } = await prisma.desafio.updateMany({
      where: { id: desafio.id, estado: 'PENDIENTE' },
      data: { estado: 'RECHAZADO', respondidoEn: new Date() },
    });
    if (count === 0) return NextResponse.json({ error: 'Ese desafío ya fue respondido.' }, { status: 409 });
    await avisar(
      await quienesQuieren(adminsRetador, 'avisosDesafios'),
      'DESAFIO_RECHAZADO',
      `${rival.nombre} no aceptó el desafío`,
      `El del ${rotuloFecha(desafio.fecha)}. Probá con otra fecha u otro rival.`,
      '/desafios'
    );
    return NextResponse.json({ listo: true });
  }

  // Aceptar: primero se toma el desafío (condicionado), después se arma el partido.
  const { count } = await prisma.desafio.updateMany({
    where: { id: desafio.id, estado: 'PENDIENTE' },
    data: { estado: 'ACEPTADO', rivalId: rival.id, respondidoEn: new Date() },
  });
  if (count === 0) return NextResponse.json({ error: 'Otro grupo lo aceptó primero.' }, { status: 409 });

  const cupo = desafio.jugadoresPorLado * 2;
  const partido = await prisma.partido.create({
    data: {
      deporteId: desafio.deporteId,
      grupoId: desafio.retadorId,
      organizadorId: desafio.creadorId,
      fecha: desafio.fecha,
      lugarNombre: desafio.lugarNombre,
      direccion: desafio.direccion,
      canchaId: desafio.canchaId,
      ciudad: desafio.ciudad,
      cupo,
      minimo: cupo,
      nivel: desafio.nivel,
      visibilidad: 'GRUPO',
      participaciones: { create: { usuarioId: desafio.creadorId, estado: 'VOY' } },
    },
  });
  await prisma.desafio.update({ where: { id: desafio.id }, data: { partidoId: partido.id } });

  const miembros = await prisma.miembroGrupo.findMany({
    where: { grupoId: { in: [desafio.retadorId, rival.id] } },
    select: { usuarioId: true },
  });
  await avisar(
    miembros.map((m) => m.usuarioId).filter((id) => id !== desafio.creadorId),
    'INVITACION',
    `${desafio.retador.nombre} vs ${rival.nombre}`,
    `Desafío aceptado: ${rotuloFecha(desafio.fecha)} en ${desafio.lugarNombre}. Confirmá si vas.`,
    `/partidos/${partido.id}`
  );

  return NextResponse.json({ partidoId: partido.id });
}
