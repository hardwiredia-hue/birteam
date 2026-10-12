import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { ipDelPedido, permitir } from '@/lib/limite';
import { COOKIE_PIN, OPCIONES_COOKIE, PIN_VALIDO, firmaDelPin, hashPinStaging } from '@/lib/pin-staging';

/** Entrar a staging con el PIN. Pocos intentos por IP: un PIN corto no se adivina probando. */
export async function POST(request: Request) {
  const hash = await hashPinStaging();
  if (!hash) return NextResponse.json({ listo: true });

  if (!permitir(`pin-staging:${ipDelPedido(request)}`, 8, 15 * 60_000)) {
    return NextResponse.json({ error: 'Demasiados intentos. Esperá 15 minutos.' }, { status: 429 });
  }
  const cuerpo = await request.json().catch(() => ({}));
  const pin = String(cuerpo?.pin ?? '').trim();
  if (!PIN_VALIDO.test(pin) || !(await bcrypt.compare(pin, hash))) {
    return NextResponse.json({ error: 'PIN incorrecto.' }, { status: 401 });
  }
  const respuesta = NextResponse.json({ listo: true });
  respuesta.cookies.set(COOKIE_PIN, firmaDelPin(hash), OPCIONES_COOKIE);
  return respuesta;
}
