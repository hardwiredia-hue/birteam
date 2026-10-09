import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { usuarioActual } from '@/lib/auth';
import { erroresDeZod } from '@/lib/validacion';
import { jugoEnLaCancha } from '@/lib/resenas';
import { enviarPush } from '@/lib/push';

const esquemaResena = z.object({
  puntaje: z.number({ error: 'Elegí las estrellas.' }).int().min(1, 'Elegí las estrellas.').max(5),
  texto: z.string().trim().max(600, 'La reseña es muy larga.').nullish(),
});

/** Dejar (o editar) la reseña propia. Solo quien jugó en la cancha. */
export async function POST(request: Request, contexto: { params: Promise<{ id: string }> }) {
  const usuario = await usuarioActual();
  if (!usuario) return NextResponse.json({ error: 'Entrá primero.' }, { status: 401 });

  const { id } = await contexto.params;
  const cancha = await prisma.cancha.findUnique({ where: { id }, select: { id: true, nombre: true, duenoId: true } });
  if (!cancha) return NextResponse.json({ error: 'Esa cancha no existe.' }, { status: 404 });
  if (cancha.duenoId === usuario.id) {
    return NextResponse.json({ error: 'No podés reseñar tu propia cancha.' }, { status: 403 });
  }
  if (!(await jugoEnLaCancha(usuario.id, cancha.id))) {
    return NextResponse.json(
      { error: 'Reseñan los que jugaron acá: con un turno confirmado o un partido en esta cancha.' },
      { status: 403 }
    );
  }

  const cuerpo = await request.json().catch(() => null);
  const datos = esquemaResena.safeParse(cuerpo);
  if (!datos.success) {
    return NextResponse.json(
      { error: 'Revisá los datos.', detalles: erroresDeZod(datos.error) },
      { status: 400 }
    );
  }
  const { puntaje } = datos.data;
  const texto = datos.data.texto || null;

  const previa = await prisma.resenaCancha.findUnique({
    where: { canchaId_usuarioId: { canchaId: cancha.id, usuarioId: usuario.id } },
  });
  const resena = await prisma.resenaCancha.upsert({
    where: { canchaId_usuarioId: { canchaId: cancha.id, usuarioId: usuario.id } },
    create: { canchaId: cancha.id, usuarioId: usuario.id, puntaje, texto },
    update: { puntaje, texto },
  });

  if (!previa) {
    const titulo = `Nueva reseña · ${cancha.nombre}`;
    const cuerpoAviso = `${usuario.nombre} le puso ${'★'.repeat(puntaje)}${texto ? `: “${texto.slice(0, 80)}”` : ''}`;
    await prisma.notificacion.create({
      data: { usuarioId: cancha.duenoId, tipo: 'RESENA', titulo, cuerpo: cuerpoAviso, url: `/canchas/${cancha.id}` },
    });
    await enviarPush(cancha.duenoId, { titulo, cuerpo: cuerpoAviso, url: `/canchas/${cancha.id}` });
  }

  return NextResponse.json({ id: resena.id }, { status: previa ? 200 : 201 });
}
