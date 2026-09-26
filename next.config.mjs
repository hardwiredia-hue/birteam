/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  // El deploy compila a un costado (DIST_DIR=.next.nuevo) y recién al final
  // intercambia carpetas: el sitio vivo nunca se queda sin su .next.
  distDir: process.env.DIST_DIR ?? '.next',
};

export default nextConfig;
