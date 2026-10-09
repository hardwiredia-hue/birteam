import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { cookies } from 'next/headers';
import { usuarioActual } from '@/lib/auth';
import { mercadoPagoHabilitado, urlConexion, urlPublica } from '@/lib/mercadopago';

/** Manda al dueño a autorizar a birteam en su cuenta de Mercado Pago. */
export async function GET(request: Request) {
  const usuario = await usuarioActual();
  const base = urlPublica(request);
  if (!usuario) return NextResponse.redirect(`${base}/entrar`);
  if (usuario.tipoCuenta !== 'CANCHA' || !mercadoPagoHabilitado()) {
    return NextResponse.redirect(`${base}/complejo?mp=no_disponible`);
  }
  const estado = randomBytes(24).toString('hex');
  const jar = await cookies();
  jar.set('mp_estado', estado, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 600,
    path: '/',
  });
  return NextResponse.redirect(urlConexion(request, estado));
}
