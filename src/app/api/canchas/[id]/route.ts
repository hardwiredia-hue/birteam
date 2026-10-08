import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { usuarioActual } from '@/lib/auth';
import { esquemaCancha, erroresDeZod } from '@/lib/validacion';

const esquemaEditar = esquemaCancha.extend({
  // El dueño puede pausar la publicación sin borrarla.
  activa: z.boolean().default(true),
  // Las fotos ya guardadas llegan como URL completa; las nuevas, como nombre.
  fotos: z.array(z.string().max(120)).max(5, 'Hasta 5 fotos.').default([]),
});

/** Editar (o pausar) la cancha. Solo el dueño. */
export async function PATCH(request: Request, contexto: { params: Promise<{ id: string }> }) {
  const usuario = await usuarioActual();
  if (!usuario) return NextResponse.json({ error: 'Entrá primero.' }, { status: 401 });

  const { id } = await contexto.params;
  const cancha = await prisma.cancha.findUnique({ where: { id } });
  if (!cancha) return NextResponse.json({ error: 'Esa cancha no existe.' }, { status: 404 });
  if (cancha.duenoId !== usuario.id && usuario.rol !== 'ADMIN') {
    return NextResponse.json({ error: 'Edita quien la publicó.' }, { status: 403 });
  }

  const cuerpo = await request.json().catch(() => null);
  const datos = esquemaEditar.safeParse(cuerpo);
  if (!datos.success) {
    return NextResponse.json(
      { error: 'Revisá los datos marcados.', detalles: erroresDeZod(datos.error) },
      { status: 400 }
    );
  }
  const d = datos.data;

  const fotos = d.fotos
    .map((foto) =>
      /^[0-9a-f-]{36}\.(jpg|png|webp)$/.test(foto) ? `/api/archivos/${foto}` : foto
    )
    .filter((foto) => /^\/api\/archivos\/[0-9a-f-]{36}\.(jpg|png|webp)$/.test(foto));

  await prisma.cancha.update({
    where: { id: cancha.id },
    data: {
      nombre: d.nombre,
      descripcion: d.descripcion ?? null,
      deporteId: d.deporteId,
      direccion: d.direccion,
      ciudad: d.ciudad ?? null,
      provincia: d.provincia ?? null,
      pais: d.pais,
      ...(d.latitud != null && d.longitud != null
        ? { latitud: d.latitud, longitud: d.longitud }
        : {}),
      precioPorHora: d.precioPorHora ?? null,
      telefono: d.telefono ?? null,
      fotos: JSON.stringify(fotos),
      diasDisponibles: JSON.stringify([...new Set(d.diasDisponibles)].sort()),
      activa: d.activa,
    },
  });

  return NextResponse.json({ listo: true });
}

/** Borrar la publicación. Solo el dueño (o administración). */
export async function DELETE(request: Request, contexto: { params: Promise<{ id: string }> }) {
  const usuario = await usuarioActual();
  if (!usuario) return NextResponse.json({ error: 'Entrá primero.' }, { status: 401 });

  const { id } = await contexto.params;
  const cancha = await prisma.cancha.findUnique({ where: { id } });
  if (!cancha) return NextResponse.json({ error: 'Esa cancha no existe.' }, { status: 404 });
  if (cancha.duenoId !== usuario.id && usuario.rol !== 'ADMIN') {
    return NextResponse.json({ error: 'Borra quien la publicó.' }, { status: 403 });
  }

  await prisma.cancha.delete({ where: { id: cancha.id } });
  return NextResponse.json({ listo: true });
}
