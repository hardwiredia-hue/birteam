import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { adminActual, auditar } from '@/lib/admin';
import { COOKIE_PIN, OPCIONES_COOKIE, PIN_VALIDO, esStaging, firmaDelPin, guardarPin } from '@/lib/pin-staging';

/** Poner o cambiar el PIN de staging. Solo administración y solo en staging. */
export async function POST(request: Request) {
  const admin = await adminActual();
  if (!admin) return NextResponse.json({ error: 'Solo administración.' }, { status: 403 });
  if (!esStaging()) return NextResponse.json({ error: 'El PIN es solo para staging.' }, { status: 409 });

  const cuerpo = await request.json().catch(() => ({}));
  const pin = String(cuerpo?.pin ?? '').trim();
  if (!PIN_VALIDO.test(pin)) {
    return NextResponse.json({ error: 'El PIN tiene que ser de 4 a 8 números.' }, { status: 400 });
  }
  const hash = await bcrypt.hash(pin, 10);
  await guardarPin(hash);
  await auditar(admin, 'PIN_STAGING', null, 'puesto o cambiado');
  // Quien lo pone queda adentro (las demás sesiones tienen que poner el PIN nuevo).
  const respuesta = NextResponse.json({ listo: true });
  respuesta.cookies.set(COOKIE_PIN, firmaDelPin(hash), OPCIONES_COOKIE);
  return respuesta;
}

/** Sacar el PIN: staging queda abierto (igual sin aparecer en buscadores). */
export async function DELETE() {
  const admin = await adminActual();
  if (!admin) return NextResponse.json({ error: 'Solo administración.' }, { status: 403 });
  if (!esStaging()) return NextResponse.json({ error: 'El PIN es solo para staging.' }, { status: 409 });
  await guardarPin(null);
  await auditar(admin, 'PIN_STAGING', null, 'sacado');
  return NextResponse.json({ listo: true });
}
