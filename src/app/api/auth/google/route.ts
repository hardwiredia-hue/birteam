import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { randomUUID } from 'crypto';
import { googleHabilitado, urlAutorizacion } from '@/lib/google';
import { sitioEnConstruccion } from '@/lib/sitio';

/** Arranca el ingreso con Google: manda a elegir la cuenta. */
export async function GET(request: Request) {
  if (!googleHabilitado()) {
    return NextResponse.redirect(new URL('/entrar', request.url));
  }
  if (await sitioEnConstruccion()) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Estado anti-CSRF: viaja a Google y vuelve; tiene que coincidir.
  const estado = randomUUID();
  (await cookies()).set('birteam_google_estado', estado, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 600,
    path: '/',
  });

  return NextResponse.redirect(urlAutorizacion(request, estado));
}
