import { cookies } from 'next/headers';
import { cache } from 'react';
import { randomBytes } from 'crypto';
import bcrypt from 'bcryptjs';
import { prisma } from './db';

const NOMBRE_COOKIE = 'birteam_sesion';
const DIAS_SESION = 30;

export function hashearClave(clave: string) {
  return bcrypt.hash(clave, 10);
}

export function verificarClave(clave: string, hash: string) {
  return bcrypt.compare(clave, hash);
}

/** Crea la sesión en la base y deja la cookie. Llamar desde un route handler. */
export async function crearSesion(usuarioId: string) {
  const token = randomBytes(32).toString('hex');
  const expiraEn = new Date(Date.now() + DIAS_SESION * 24 * 60 * 60 * 1000);
  await prisma.sesion.create({ data: { token, usuarioId, expiraEn } });

  const jar = await cookies();
  jar.set(NOMBRE_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    expires: expiraEn,
    path: '/',
  });
}

/** Borra la sesión actual (base + cookie). */
export async function cerrarSesion() {
  const jar = await cookies();
  const token = jar.get(NOMBRE_COOKIE)?.value;
  if (token) {
    await prisma.sesion.deleteMany({ where: { token } });
    jar.delete(NOMBRE_COOKIE);
  }
}

/**
 * Usuario de la sesión actual, o null. Cacheado por pedido para que layout,
 * página y componentes puedan llamarlo sin repetir la consulta.
 */
export const usuarioActual = cache(async () => {
  const jar = await cookies();
  const token = jar.get(NOMBRE_COOKIE)?.value;
  if (!token) return null;

  const sesion = await prisma.sesion.findUnique({
    where: { token },
    include: { usuario: { include: { deportes: { include: { deporte: true } } } } },
  });
  if (!sesion) return null;
  if (sesion.expiraEn < new Date()) {
    await prisma.sesion.delete({ where: { id: sesion.id } }).catch(() => {});
    return null;
  }
  return sesion.usuario;
});

export type UsuarioConDeportes = NonNullable<Awaited<ReturnType<typeof usuarioActual>>>;
