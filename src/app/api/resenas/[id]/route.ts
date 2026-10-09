import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { usuarioActual } from '@/lib/auth';
import { erroresDeZod } from '@/lib/validacion';

const esquemaRespuesta = z.object({
  respuesta: z.string().trim().max(600, 'La respuesta es muy larga.').nullish(),
});

/** El dueño de la cancha responde la reseña (o borra su respuesta). */
export async function PATCH(request: Request, contexto: { params: Promise<{ id: string }> }) {
  const usuario = await usuarioActual();
  if (!usuario) return NextResponse.json({ error: 'Entrá primero.' }, { status: 401 });

  const { id } = await contexto.params;
  const resena = await prisma.resenaCancha.findUnique({
    where: { id },
    include: { cancha: { select: { id: true, nombre: true, duenoId: true } } },
  });
  if (!resena) return NextResponse.json({ error: 'Esa reseña no existe.' }, { status: 404 });
  if (resena.cancha.duenoId !== usuario.id) {
    return NextResponse.json({ error: 'Responde el dueño de la cancha.' }, { status: 403 });
  }

  const cuerpo = await request.json().catch(() => null);
  const datos = esquemaRespuesta.safeParse(cuerpo);
  if (!datos.success) {
    return NextResponse.json(
      { error: 'Revisá los datos.', detalles: erroresDeZod(datos.error) },
      { status: 400 }
    );
  }
  const respuesta = datos.data.respuesta || null;

  await prisma.resenaCancha.update({
    where: { id: resena.id },
    data: { respuesta, respondidaEn: respuesta ? new Date() : null },
  });
  if (respuesta && !resena.respuesta) {
    await prisma.notificacion.create({
      data: {
        usuarioId: resena.usuarioId,
        tipo: 'RESENA_RESPUESTA',
        titulo: `${resena.cancha.nombre} respondió tu reseña`,
        cuerpo: respuesta.slice(0, 120),
        url: `/canchas/${resena.cancha.id}`,
      },
    });
  }
  return NextResponse.json({ listo: true });
}

/** Borrar la reseña propia (o administración). */
export async function DELETE(request: Request, contexto: { params: Promise<{ id: string }> }) {
  const usuario = await usuarioActual();
  if (!usuario) return NextResponse.json({ error: 'Entrá primero.' }, { status: 401 });

  const { id } = await contexto.params;
  const resena = await prisma.resenaCancha.findUnique({ where: { id } });
  if (!resena) return NextResponse.json({ error: 'Esa reseña no existe.' }, { status: 404 });
  if (resena.usuarioId !== usuario.id && usuario.rol !== 'ADMIN') {
    return NextResponse.json({ error: 'Esa reseña no es tuya.' }, { status: 403 });
  }
  await prisma.resenaCancha.delete({ where: { id: resena.id } });
  return NextResponse.json({ listo: true });
}
