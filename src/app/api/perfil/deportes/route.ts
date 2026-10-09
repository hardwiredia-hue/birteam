import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { usuarioActual } from '@/lib/auth';
import { erroresDeZod } from '@/lib/validacion';
import { MAX_DEPORTES_USUARIO, NIVELES } from '@/lib/constantes';

const esquemaDeportes = z.object({
  deportes: z
    .array(
      z.object({
        deporteId: z.string().min(1),
        principal: z.boolean().default(false),
        posicion: z.string().trim().max(40, 'La posición es muy larga.').nullish(),
        nivel: z.enum(NIVELES).nullish(),
      })
    )
    .max(MAX_DEPORTES_USUARIO, `Elegí hasta ${MAX_DEPORTES_USUARIO} deportes.`),
});

/** Guarda el perfil deportivo completo: qué jugás, cuál es el principal, posición y nivel. */
export async function PUT(request: Request) {
  const usuario = await usuarioActual();
  if (!usuario) return NextResponse.json({ error: 'Entrá primero.' }, { status: 401 });

  const cuerpo = await request.json().catch(() => null);
  const datos = esquemaDeportes.safeParse(cuerpo);
  if (!datos.success) {
    return NextResponse.json(
      { error: 'Revisá los datos.', detalles: erroresDeZod(datos.error) },
      { status: 400 }
    );
  }

  // Sin repetidos y solo deportes que existen.
  const unicos = [...new Map(datos.data.deportes.map((d) => [d.deporteId, d])).values()];
  const existentes = await prisma.deporte.findMany({
    where: { id: { in: unicos.map((d) => d.deporteId) } },
    select: { id: true },
  });
  const validos = unicos.filter((d) => existentes.some((e) => e.id === d.deporteId));
  // Un solo principal: el marcado, o el primero si no marcaron ninguno.
  const principal = validos.find((d) => d.principal)?.deporteId ?? validos[0]?.deporteId;

  await prisma.$transaction([
    prisma.usuarioDeporte.deleteMany({ where: { usuarioId: usuario.id } }),
    prisma.usuarioDeporte.createMany({
      data: validos.map((d) => ({
        usuarioId: usuario.id,
        deporteId: d.deporteId,
        principal: d.deporteId === principal,
        posicion: d.posicion || null,
        nivel: d.nivel ?? null,
      })),
    }),
  ]);

  return NextResponse.json({ listo: true });
}
