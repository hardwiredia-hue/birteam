/**
 * Suscripción de dueño de cancha: sin pasarela de pago todavía, la activa
 * la administración desde el backoffice (30 días por vez). Publicar canchas
 * exige suscripción activa.
 */
export function suscripcionActiva(usuario: { suscripcionHasta: Date | null }) {
  return Boolean(usuario.suscripcionHasta && usuario.suscripcionHasta > new Date());
}
