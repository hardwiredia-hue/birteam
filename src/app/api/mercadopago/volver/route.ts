import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { usuarioActual } from '@/lib/auth';
import { conectarCuenta, pagosSimulados, registrarEvento, urlPublica } from '@/lib/mercadopago';

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
    // El simulador vuelve con un código propio; solo vale con el simulador prendido.
    const simulado = codigo === 'simulado' && (await pagosSimulados());
    await conectarCuenta(usuario.id, codigo, request, simulado);
    await registrarEvento(null, simulado ? 'CUENTA_CONECTADA_SIMULADA' : 'CUENTA_CONECTADA', usuario.id);
    return NextResponse.redirect(`${base}/complejo?mp=conectada`);
  } catch (error) {
    await registrarEvento(null, 'CONEXION_FALLIDA', `${usuario.id}: ${(error as Error).message}`);
    return NextResponse.redirect(`${base}/complejo?mp=error`);
  }
}
