import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { usuarioActual } from '@/lib/auth';
import { conectarCuenta, registrarEvento, urlPublica } from '@/lib/mercadopago';

/** Vuelta del OAuth: valida el estado (anti-CSRF) y guarda la cuenta conectada. */
export async function GET(request: Request) {
  const base = urlPublica(request);
  const url = new URL(request.url);
  const jar = await cookies();
  const esperado = jar.get('mp_estado')?.value;
  jar.delete('mp_estado');

  const usuario = await usuarioActual();
  if (!usuario) return NextResponse.redirect(`${base}/entrar`);
  const codigo = url.searchParams.get('code');
  if (!codigo || !esperado || url.searchParams.get('state') !== esperado) {
    return NextResponse.redirect(`${base}/complejo?mp=error`);
  }
  try {
    await conectarCuenta(usuario.id, codigo, request);
    await registrarEvento(null, 'CUENTA_CONECTADA', usuario.id);
    return NextResponse.redirect(`${base}/complejo?mp=conectada`);
  } catch (error) {
    await registrarEvento(null, 'CONEXION_FALLIDA', `${usuario.id}: ${(error as Error).message}`);
    return NextResponse.redirect(`${base}/complejo?mp=error`);
  }
}
