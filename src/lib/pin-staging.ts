import { createHmac, timingSafeEqual } from 'crypto';
import { cache } from 'react';
import { prisma } from './db';
import { ambiente } from './publico';

/**
 * PIN de staging: con el PIN cargado (desde el backoffice de staging), el
 * sitio de pruebas pide el PIN antes de mostrar cualquier pantalla. El PIN
 * se guarda hasheado (bcrypt) y nunca viaja en el código ni en el repo.
 * En producción esto no existe.
 */

export const COOKIE_PIN = 'birteam_staging';
const CLAVE_AJUSTE = 'pin_staging';
export const PIN_VALIDO = /^\d{4,8}$/;

/** ¿Este proceso es staging? (PIN_STAGING_SIEMPRE=1 solo para probarlo en desarrollo.) */
export function esStaging() {
  return ambiente() === 'staging' || process.env.PIN_STAGING_SIEMPRE === '1';
}

/** Hash del PIN vigente, o null si staging está abierto (o no es staging). */
export async function leerHashPin() {
  if (!esStaging()) return null;
  try {
    const ajuste = await prisma.ajuste.findUnique({ where: { clave: CLAVE_AJUSTE } });
    return ajuste?.valor || null;
  } catch {
    return null;
  }
}

export const hashPinStaging = cache(leerHashPin);

/** Valor de la cookie de acceso: cambia si cambia el PIN (las sesiones viejas caducan). */
export function firmaDelPin(hash: string) {
  return createHmac('sha256', hash).update('birteam-staging-acceso').digest('hex');
}

export function cookieValida(hash: string, valor: string | undefined) {
  if (!valor) return false;
  const esperada = Buffer.from(firmaDelPin(hash));
  const recibida = Buffer.from(valor);
  return esperada.length === recibida.length && timingSafeEqual(esperada, recibida);
}

export async function guardarPin(hash: string | null) {
  if (hash === null) {
    await prisma.ajuste.deleteMany({ where: { clave: CLAVE_AJUSTE } });
    return;
  }
  await prisma.ajuste.upsert({
    where: { clave: CLAVE_AJUSTE },
    create: { clave: CLAVE_AJUSTE, valor: hash },
    update: { valor: hash },
  });
}

export const OPCIONES_COOKIE = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: 30 * 24 * 3600,
};
