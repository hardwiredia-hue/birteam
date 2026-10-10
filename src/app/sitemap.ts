import type { MetadataRoute } from 'next';
import { prisma } from '@/lib/db';
import { canchasVisibles, sitioPublico } from '@/lib/publico';

export const dynamic = 'force-dynamic';

/** Mapa del sitio para buscadores: portada, legales y las canchas publicadas. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = sitioPublico();
  const canchas = await prisma.cancha.findMany({
    where: canchasVisibles(),
    select: { id: true, actualizadoEn: true },
    take: 5000,
  });
  return [
    { url: `${base}/`, changeFrequency: 'weekly', priority: 1 },
    { url: `${base}/c`, changeFrequency: 'daily', priority: 0.9 },
    ...canchas.map((cancha) => ({
      url: `${base}/c/${cancha.id}`,
      lastModified: cancha.actualizadoEn,
      changeFrequency: 'daily' as const,
      priority: 0.8,
    })),
    { url: `${base}/terminos`, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${base}/privacidad`, changeFrequency: 'yearly', priority: 0.2 },
  ];
}
