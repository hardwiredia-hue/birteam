import { z } from 'zod';

// Mensajes en castellano, concretos, como manda el diseño.

export const esquemaRegistro = z.object({
  nombre: z
    .string({ error: 'Contanos tu nombre.' })
    .trim()
    .min(2, 'El nombre es muy corto.')
    .max(60, 'El nombre es muy largo.'),
  usuario: z
    .string({ error: 'Elegí un nombre de usuario.' })
    .trim()
    .toLowerCase()
    .min(3, 'El usuario necesita al menos 3 caracteres.')
    .max(24, 'El usuario puede tener hasta 24 caracteres.')
    .regex(/^[a-z0-9._]+$/, 'Solo letras, números, punto y guion bajo.'),
  email: z.email({ error: 'Ese email no parece válido.' }).trim().toLowerCase(),
  clave: z
    .string({ error: 'Elegí una contraseña.' })
    .min(8, 'La contraseña necesita al menos 8 caracteres.')
    .max(72, 'La contraseña es demasiado larga.'),
  deporteIds: z.array(z.string()).max(5, 'Elegí hasta 5 deportes.').default([]),
  ciudad: z.string().trim().max(80).nullish(),
  provincia: z.string().trim().max(80).nullish(),
  pais: z.string().trim().length(2).default('AR'),
  latitud: z.number().min(-90).max(90).nullish(),
  longitud: z.number().min(-180).max(180).nullish(),
  aceptaTerminos: z.literal(true, {
    error: 'Para crear la cuenta tenés que aceptar los términos.',
  }),
});

export const esquemaEntrar = z.object({
  usuarioOEmail: z.string({ error: 'Ingresá tu usuario o email.' }).trim().toLowerCase().min(1, 'Ingresá tu usuario o email.'),
  clave: z.string({ error: 'Ingresá tu contraseña.' }).min(1, 'Ingresá tu contraseña.'),
});

export const esquemaPartido = z.object({
  deporteId: z.string({ error: 'Elegí el deporte.' }).min(1, 'Elegí el deporte.'),
  fecha: z.coerce.date({ error: 'Elegí cuándo juegan.' }).refine(
    (fecha) => fecha.getTime() > Date.now() - 60 * 60 * 1000,
    'La fecha ya pasó. Elegí una futura.'
  ),
  recurrenteSemanal: z.boolean().default(false),
  lugarNombre: z
    .string({ error: 'Contanos dónde juegan.' })
    .trim()
    .min(2, 'El lugar es muy corto.')
    .max(120, 'El lugar es muy largo.'),
  direccion: z.string().trim().max(160).nullish(),
  ciudad: z.string().trim().max(80).nullish(),
  provincia: z.string().trim().max(80).nullish(),
  cupo: z
    .number({ error: 'Definí el cupo.' })
    .int('El cupo es un número entero.')
    .min(2, 'El cupo mínimo es 2.')
    .max(200, 'Ese cupo es demasiado grande.'),
  minimo: z.number().int().min(2, 'El mínimo es 2.').max(200).default(2),
  costoPorJugador: z.number().min(0).max(10_000_000).nullish(),
  visibilidad: z.enum(['GRUPO', 'ABIERTO']).default('GRUPO'),
  grupoId: z.string().nullish(),
}).refine((datos) => datos.minimo <= datos.cupo, {
  path: ['minimo'],
  error: 'El mínimo no puede superar el cupo.',
});

export const esquemaGrupo = z.object({
  nombre: z
    .string({ error: 'Ponele nombre al grupo.' })
    .trim()
    .min(2, 'El nombre es muy corto.')
    .max(60, 'El nombre es muy largo.'),
  deporteId: z.string({ error: 'Elegí el deporte.' }).min(1, 'Elegí el deporte.'),
  descripcion: z.string().trim().max(400, 'La descripción es muy larga.').nullish(),
});

export const esquemaMensaje = z
  .object({
    texto: z
      .string({ error: 'Escribí el mensaje.' })
      .trim()
      .min(1, 'El mensaje está vacío.')
      .max(500, 'Máximo 500 caracteres.'),
    partidoId: z.string().nullish(),
    grupoId: z.string().nullish(),
  })
  .refine((datos) => Boolean(datos.partidoId) !== Boolean(datos.grupoId), {
    error: 'El mensaje va a un partido o a un grupo.',
  });

export const esquemaAsistencia = z.object({
  asistencias: z
    .array(z.object({ usuarioId: z.string().min(1), asistio: z.boolean() }))
    .min(1, 'Marcá al menos a un jugador.')
    .max(200),
  resultado: z.string().trim().max(40, 'El resultado es muy largo.').nullish(),
});

export const esquemaRsvp = z.object({
  estado: z.enum(['VOY', 'TALVEZ', 'NOVOY'], { error: 'Estado desconocido.' }),
});

/** Respuesta uniforme de error de validación para la API. */
export function erroresDeZod(error: z.ZodError) {
  const porCampo: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const campo = String(issue.path[0] ?? '_');
    (porCampo[campo] ??= []).push(issue.message);
  }
  return porCampo;
}
