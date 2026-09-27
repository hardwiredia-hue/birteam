import { NextResponse } from 'next/server';

/**
 * Clave pública VAPID del ambiente (la usa el navegador para suscribirse).
 * Se lee en tiempo de ejecución: cada ambiente tiene la suya en .env.production.
 * Sin clave configurada devuelve null y el botón de activar avisos no aparece.
 */
export async function GET() {
  return NextResponse.json({ clave: process.env.VAPID_PUBLIC_KEY ?? null });
}
