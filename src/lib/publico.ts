import { existsSync, readFileSync } from 'fs';
import path from 'path';

/**
 * En qué ambiente corre este proceso. Ante la duda, producción (lo más
 * restrictivo para simuladores; lo correcto para buscadores lo decide robots).
 */
export function ambiente(): 'produccion' | 'staging' | 'desarrollo' {
  if (process.env.NODE_ENV !== 'production') return 'desarrollo';
  if (process.cwd().startsWith('/home/birteam/staging')) return 'staging';
  const marca = path.join(process.cwd(), '.ambiente');
  if (existsSync(marca) && readFileSync(marca, 'utf8').trim() === 'staging') return 'staging';
  return 'produccion';
}

/** URL pública canónica del sitio (para metadata, sitemap y datos estructurados). */
export function sitioPublico() {
  return (process.env.URL_PUBLICA ?? 'https://birteam.com').replace(/\/$/, '');
}

/** Canchas que se muestran al público: activas y con la suscripción del dueño al día. */
export function canchasVisibles() {
  return {
    activa: true,
    dueno: { suscripcionHasta: { gt: new Date() }, eliminadoEn: null },
  };
}
