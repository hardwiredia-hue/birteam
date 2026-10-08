import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { usuarioActual } from '@/lib/auth';
import { erroresDeZod } from '@/lib/validacion';

const esquemaEditarGrupo = z.object({
  nombre: z
    .string({ error: 'Ponele nombre al grupo.' })
    .trim()
    .min(2, 'El nombre es muy corto.')
    .max(60, 'El nombre es muy largo.'),
  descripcion: z.string().trim().max(400, 'La descripción es muy larga.').nullish(),
  abierto: z.boolean(),
});

/** Editar el grupo (nombre, descripción, abierto). Solo administradores. */
export async function PATCH(request: Request, contexto: { params: Promise<{ id: string }> }) {
  const usuario = await usuarioActual();
  if (!usuario) return NextResponse.json({ error: 'Entrá primero.' }, { status: 401 });

  const { id } = await contexto.params;
  const membresia = await prisma.miembroGrupo.findUnique({
    where: { grupoId_usuarioId: { grupoId: id, usuarioId: usuario.id } },
  });
  if (!membresia) return NextResponse.json({ error: 'Ese grupo no existe.' }, { status: 404 });
  if (membresia.rol !== 'ADMIN') {
    return NextResponse.json({ error: 'El grupo lo editan sus administradores.' }, { status: 403 });
  }

  const cuerpo = await request.json().catch(() => null);
  const datos = esquemaEditarGrupo.safeParse(cuerpo);
  if (!datos.success) {
    return NextResponse.json(
      { error: 'Revisá los datos marcados.', detalles: erroresDeZod(datos.error) },
      { status: 400 }
    );
  }

  await prisma.grupo.update({
    where: { id },
    data: {
      nombre: datos.data.nombre,
      descripcion: datos.data.descripcion ?? null,
      abierto: datos.data.abierto,
    },
  });

  return NextResponse.json({ listo: true });
}
