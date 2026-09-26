import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { hashearClave } from '@/lib/auth';

/** Cambia la contraseña con un token vigente y cierra todas las sesiones. */
export async function POST(request: Request) {
  const cuerpo = await request.json().catch(() => ({}));
  const token = String(cuerpo.token ?? '');
  const clave = String(cuerpo.clave ?? '');

  if (clave.length < 8 || clave.length > 72) {
    return NextResponse.json({ error: 'La contraseña necesita al menos 8 caracteres.' }, { status: 400 });
  }

  const registro = await prisma.tokenRecuperacion.findUnique({ where: { token } });
  if (!registro || registro.usadoEn || registro.expiraEn < new Date()) {
    return NextResponse.json(
      { error: 'El link venció o ya se usó. Pedí uno nuevo desde "¿Olvidaste tu contraseña?".' },
      { status: 410 }
    );
  }

  await prisma.$transaction([
    prisma.usuario.update({
      where: { id: registro.usuarioId },
      data: { hashClave: await hashearClave(clave) },
    }),
    prisma.tokenRecuperacion.update({
      where: { id: registro.id },
      data: { usadoEn: new Date() },
    }),
    // Todas las sesiones afuera: si alguien tenía la cuenta abierta, chau.
    prisma.sesion.deleteMany({ where: { usuarioId: registro.usuarioId } }),
  ]);

  return NextResponse.json({ listo: true });
}
