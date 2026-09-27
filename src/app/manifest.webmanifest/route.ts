import { NextResponse } from 'next/server';
import { obtenerMarca } from '@/lib/marca';

export const dynamic = 'force-dynamic';

/**
 * Manifest de la PWA. Se sirve dinámico para que el ícono que sube el
 * backoffice (Marca) llegue a la pantalla del teléfono sin tocar código.
 */
export async function GET() {
  const marca = await obtenerMarca();
  const esPropio = Boolean(marca.personalizada.icono);

  return NextResponse.json(
    {
      name: 'birteam — ¿Querés jugar? Encontrá con quién.',
      short_name: 'birteam',
      description: 'Organizá partidos, armá tu grupo y encontrá con quién jugar.',
      start_url: '/panel',
      scope: '/',
      display: 'standalone',
      background_color: '#0a0b08',
      theme_color: '#0a0b08',
      lang: 'es-AR',
      icons: [
        {
          src: marca.icono192,
          sizes: '192x192',
          ...(esPropio ? {} : { type: 'image/png' }),
          purpose: 'any',
        },
        {
          src: marca.icono512,
          sizes: '512x512',
          ...(esPropio ? {} : { type: 'image/png' }),
          purpose: 'any',
        },
        {
          src: marca.icono512,
          sizes: '512x512',
          ...(esPropio ? {} : { type: 'image/png' }),
          purpose: 'maskable',
        },
      ],
    },
    { headers: { 'Content-Type': 'application/manifest+json' } }
  );
}
