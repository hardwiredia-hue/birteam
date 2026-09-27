import webpush from 'web-push';
import { prisma } from './db';

/**
 * Notificaciones push al navegador (aunque la app esté cerrada).
 *
 * Necesita las claves VAPID del ambiente (VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY,
 * se generan con `npx web-push generate-vapid-keys`, ver deploy/PUBLICAR.md).
 * Sin claves configuradas no hace nada: la app sigue funcionando igual y los
 * avisos quedan solo en la campanita.
 */

let configurado = false;

function hayClaves() {
  return Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

function configurar() {
  if (configurado) return;
  webpush.setVapidDetails(
    'mailto:hola@birteam.com',
    process.env.VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  );
  configurado = true;
}

export interface CargaPush {
  titulo: string;
  cuerpo?: string;
  url?: string;
}

/**
 * Manda un push a todos los dispositivos suscriptos de uno o varios usuarios.
 * Nunca tira error (un push caído no puede romper la acción principal) y
 * limpia las suscripciones muertas (404/410: el navegador la dio de baja).
 */
export async function enviarPush(usuarioIds: string | string[], carga: CargaPush) {
  if (!hayClaves()) return;
  const ids = Array.isArray(usuarioIds) ? usuarioIds : [usuarioIds];
  if (ids.length === 0) return;

  let suscripciones;
  try {
    suscripciones = await prisma.suscripcionPush.findMany({
      where: { usuarioId: { in: ids } },
    });
  } catch {
    return;
  }
  if (suscripciones.length === 0) return;

  configurar();
  const mensaje = JSON.stringify(carga);

  await Promise.allSettled(
    suscripciones.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          mensaje,
          { TTL: 12 * 3600 }
        );
      } catch (error) {
        const codigo = (error as { statusCode?: number }).statusCode;
        if (codigo === 404 || codigo === 410) {
          await prisma.suscripcionPush.delete({ where: { id: s.id } }).catch(() => {});
        }
      }
    })
  );
}
