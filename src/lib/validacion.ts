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

/** Respuesta uniforme de error de validación para la API. */
export function erroresDeZod(error: z.ZodError) {
  const porCampo: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const campo = String(issue.path[0] ?? '_');
    (porCampo[campo] ??= []).push(issue.message);
  }
  return porCampo;
}
