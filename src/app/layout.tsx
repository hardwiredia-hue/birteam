import type { Metadata, Viewport } from 'next';
import { cookies } from 'next/headers';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'birteam — ¿Querés jugar? Encontrá con quién.',
    template: '%s · birteam',
  },
  description:
    'Organizá partidos, armá tu grupo y encontrá con quién jugar. Fútbol, básquet, vóley, tenis, pádel y más, cerca tuyo.',
  icons: { icon: '/birteam-iso.png' },
};

export const viewport: Viewport = {
  themeColor: '#0a0b08',
  width: 'device-width',
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Oscuro es la marca y el arranque; claro solo si el usuario lo eligió.
  const tema = (await cookies()).get('birteam_tema')?.value;

  return (
    <html lang="es-AR" data-theme={tema === 'claro' ? 'light' : undefined}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Archivo:ital,wght@1,800;1,900&family=Instrument+Sans:wght@400;600&family=Spline+Sans+Mono:wght@400;500&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
