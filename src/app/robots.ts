import type { MetadataRoute } from 'next';
import { ambiente, sitioPublico } from '@/lib/publico';

/** Producción se indexa (solo lo público); staging y desarrollo, nada. */
export default function robots(): MetadataRoute.Robots {
  const base = sitioPublico();
  if (ambiente() !== 'produccion') {
    return { rules: { userAgent: '*', disallow: '/' } };
  }
  return {
    rules: {
      userAgent: '*',
      allow: ['/', '/c', '/c/'],
      disallow: ['/api/', '/admin', '/mp-simulado', '/panel', '/perfil', '/reservas', '/mensajes', '/notificaciones', '/complejo'],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
