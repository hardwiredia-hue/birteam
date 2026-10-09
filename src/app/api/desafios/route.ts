import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { usuarioActual } from '@/lib/auth';
import { permitir } from '@/lib/limite';
import { erroresDeZod } from '@/lib/validacion';
import { NIVELES } from '@/lib/constantes';
import { adminsDelGrupo, avisar, rotuloFecha } from '@/lib/desafios';

const esquemaDesafio = z.object({
  retadorId: z.string().min(1, 'Elegí tu grupo.'),
  rivalId: z.string().nullish(),
  fecha: z.coerce
    .date({ error: 'Elegí día y hora.' })
    .refine((fecha) => fecha.getTime() > Date.now() + 60 * 60 * 1000, 'Elegí una fecha futura (con al menos 1 h de margen).'),
  lugarNombre: z.string({ error: 'Contanos dónde.' }).trim().min(2, 'El lugar es muy corto.').max(120),
  direccion: z.string().trim().max(160).nullish(),
  canchaId: z.string().nullish(),
  jugadoresPorLado: z.number().int().min(1).max(15).default(5),
  nivel: z.enum(NIVELES).nullish(),
  mensaje: z.string().trim().max(300, 'El mensaje es muy largo.').nullish(),
});

/** Desafiar a otro grupo (o publicar el desafío abierto). Solo admins del grupo retador. */
export async function POST(request: Request) {
  const usuario = await usuarioActual();
  if (!usuario) return NextResponse.json({ error: 'Entrá primero.' }, { status: 401 });
  if (!permitir(`desafio:${usuario.id}`, 10, 60 * 60_000)) {
    return NextResponse.json({ error: 'Mandaste muchos desafíos. Probá más tarde.' }, { status: 429 });
  }

  const cuerpo = await request.json().catch(() => null);
  const datos = esquemaDesafio.safeParse(cuerpo);
  if (!datos.success) {
    return NextResponse.json(
      { error: 'Revisá los datos marcados.', detalles: erroresDeZod(datos.error) },
      { status: 400 }
    );
  }
  const d = datos.data;

  const retador = await prisma.grupo.findUnique({ where: { id: d.retadorId } });
  if (!retador) return NextResponse.json({ error: 'Ese grupo no existe.' }, { status: 404 });
  const soyAdmin = await prisma.miembroGrupo.findFirst({
    where: { grupoId: retador.id, usuarioId: usuario.id, rol: 'ADMIN' },
  });
  if (!soyAdmin) {
    return NextResponse.json({ error: 'Desafían los admins del grupo.' }, { status: 403 });
  }

  let rival = null;
  if (d.rivalId) {
    rival = await prisma.grupo.findUnique({ where: { id: d.rivalId } });
    if (!rival) return NextResponse.json({ error: 'El grupo rival no existe.' }, { status: 404 });
    if (rival.id === retador.id) {
      return NextResponse.json({ error: 'No podés desafiar a tu propio grupo.' }, { status: 400 });
    }
    if (rival.deporteId !== retador.deporteId) {
      return NextResponse.json({ error: 'El rival tiene que ser del mismo deporte.' }, { status: 400 });
    }
    const repetido = await prisma.desafio.findFirst({
      where: { retadorId: retador.id, rivalId: rival.id, estado: 'PENDIENTE' },
    });
    if (repetido) {
      return NextResponse.json({ error: 'Ya tenés un desafío pendiente con ese grupo.' }, { status: 409 });
    }
  }

  let canchaId: string | null = null;
  if (d.canchaId) {
    const cancha = await prisma.cancha.findUnique({ where: { id: d.canchaId }, select: { id: true } });
    canchaId = cancha?.id ?? null;
  }

  const desafio = await prisma.desafio.create({
    data: {
      deporteId: retador.deporteId,
      retadorId: retador.id,
      rivalId: rival?.id ?? null,
      creadorId: usuario.id,
      fecha: d.fecha,
      lugarNombre: d.lugarNombre,
      direccion: d.direccion ?? null,
      canchaId,
      ciudad: retador.ciudad,
      jugadoresPorLado: d.jugadoresPorLado,
      nivel: d.nivel ?? null,
      mensaje: d.mensaje || null,
    },
  });

  if (rival) {
    await avisar(
      await adminsDelGrupo(rival.id),
      'DESAFIO',
      `${retador.nombre} los desafía`,
      `${rotuloFecha(d.fecha)} en ${d.lugarNombre}, ${d.jugadoresPorLado} contra ${d.jugadoresPorLado}. ¿Aceptan?`,
      '/desafios'
    );
  }

  return NextResponse.json({ id: desafio.id }, { status: 201 });
}
