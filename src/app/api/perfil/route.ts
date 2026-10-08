import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { usuarioActual } from '@/lib/auth';
import { erroresDeZod } from '@/lib/validacion';
import { validarCuit, formatearCuit } from '@/lib/verificacion';

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
  // Datos de dueño de cancha; solo se tocan si vienen.
  complejoNombre: z.string().trim().min(2).max(80).optional(),
  cuit: z.string().trim().max(15).optional(),
  // Comprobante de titularidad recién subido: manda la cuenta a revisión.
  verificacionDoc: z
    .string()
    .regex(/^[0-9a-f-]{36}\.(jpg|png|webp)$/, 'Comprobante inválido.')
    .optional(),
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

  if (d.cuit !== undefined && !validarCuit(d.cuit)) {
    return NextResponse.json(
      { error: 'Revisá los datos marcados.', detalles: { cuit: ['Ese CUIT/CUIL no es válido.'] } },
      { status: 400 }
    );
  }

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
      ...(d.complejoNombre !== undefined ? { complejoNombre: d.complejoNombre } : {}),
      ...(d.cuit !== undefined ? { cuit: formatearCuit(d.cuit) } : {}),
      ...(d.verificacionDoc
        ? {
            verificacionDocUrl: `/api/archivos/${d.verificacionDoc}`,
            verificacion: 'EN_REVISION',
          }
        : {}),
    },
  });

  return NextResponse.json({ listo: true });
}
