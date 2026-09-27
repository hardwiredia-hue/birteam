import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { usuarioActual } from '@/lib/auth';
import { erroresDeZod } from '@/lib/validacion';

const esquemaPerfil = z.object({
  nombre: z.string({ error: 'Contanos tu nombre.' }).trim().min(2, 'El nombre es muy corto.').max(60),
  // Nombre de archivo ya subido a /api/archivos; null borra la foto.
  avatar: z
    .string()
    .regex(/^[0-9a-f-]{36}\.(jpg|png|webp)$/, 'Foto inválida.')
    .nullish(),
  bio: z.string().trim().max(300, 'La bio es muy larga.').nullish(),
  telefono: z.string().trim().max(30).nullish(),
  ciudad: z.string().trim().max(80).nullish(),
  provincia: z.string().trim().max(80).nullish(),
  pais: z.string().trim().length(2).default('AR'),
  latitud: z.number().min(-90).max(90).nullish(),
  longitud: z.number().min(-180).max(180).nullish(),
  // Jugador o dueño de cancha; si no viene, no se toca.
  tipoCuenta: z.enum(['JUGADOR', 'CANCHA']).optional(),
});

export async function PATCH(request: Request) {
  const usuario = await usuarioActual();
  if (!usuario) return NextResponse.json({ error: 'Entrá primero.' }, { status: 401 });

  const cuerpo = await request.json().catch(() => null);
  const datos = esquemaPerfil.safeParse(cuerpo);
  if (!datos.success) {
    return NextResponse.json(
      { error: 'Revisá los datos marcados.', detalles: erroresDeZod(datos.error) },
      { status: 400 }
    );
  }
  const d = datos.data;

  await prisma.usuario.update({
    where: { id: usuario.id },
    data: {
      nombre: d.nombre,
      // La foto solo se toca si vino en el pedido: nombre nuevo o null (borrar).
      ...(d.avatar !== undefined
        ? { avatarUrl: d.avatar ? `/api/archivos/${d.avatar}` : null }
        : {}),
      bio: d.bio ?? null,
      telefono: d.telefono ?? null,
      ciudad: d.ciudad ?? null,
      provincia: d.provincia ?? null,
      pais: d.pais,
      // Coordenadas: solo se pisan si llegaron (una ciudad nueva del selector).
      ...(d.latitud != null && d.longitud != null
        ? { latitud: d.latitud, longitud: d.longitud }
        : {}),
      ...(d.tipoCuenta ? { tipoCuenta: d.tipoCuenta } : {}),
    },
  });

  return NextResponse.json({ listo: true });
}
