import { existsSync, readFileSync } from 'fs';

// El deploy escribe .ambiente antes de compilar: en staging, todo sale con
// "no indexar" (ni páginas, ni imágenes, ni la API) para cualquier buscador.
const esStaging = existsSync('.ambiente') && readFileSync('.ambiente', 'utf8').trim() === 'staging';

/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  async headers() {
    if (!esStaging) return [];
    return [{ source: '/:path*', headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive, nosnippet' }] }];
  },
  // El deploy compila a un costado (DIST_DIR=.next.nuevo) y recién al final
  // intercambia carpetas: el sitio vivo nunca se queda sin su .next.
  distDir: process.env.DIST_DIR ?? '.next',
};

export default nextConfig;
