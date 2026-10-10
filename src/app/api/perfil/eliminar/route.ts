import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/db';
import { usuarioActual, verificarClave } from '@/lib/auth';
import { permitir } from '@/lib/limite';
import { eliminarCuenta, impedimentoParaBaja } from '@/lib/baja';
import { registrarEvento } from '@/lib/mercadopago';

/**
 * Cerrar la cuenta. Se confirma escribiendo el @usuario y, si la cuenta
 * tiene contraseña, con la contraseña. No hay vuelta atrás.
 */
export async function POST(request: Request) {
  const usuario = await usuarioActual();
  if (!usuario) return NextResponse.json({ error: 'Entrá primero.' }, { status: 401 });
  if (!permitir(`baja:${usuario.id}`, 5, 15 * 60_000)) {
    return NextResponse.json({ error: 'Demasiados intentos. Esperá unos minutos.' }, { status: 429 });
  }

  const cuerpo = await request.json().catch(() => ({}));
  const confirmacion = String(cuerpo?.confirmacion ?? '').trim().replace(/^@/, '').toLowerCase();
  if (confirmacion !== usuario.usuario.toLowerCase()) {
    return NextResponse.json({ error: `Escribí tu usuario (@${usuario.usuario}) para confirmar.` }, { status: 400 });
  }
  if (usuario.hashClave) {
    const clave = String(cuerpo?.clave ?? '');
    if (!clave || !(await verificarClave(clave, usuario.hashClave))) {
      return NextResponse.json({ error: 'La contraseña no es correcta.' }, { status: 400 });
    }
  }
  if (usuario.rol === 'ADMIN') {
    const otrosAdmins = await prisma.usuario.count({
      where: { rol: 'ADMIN', id: { not: usuario.id }, eliminadoEn: null },
    });
    if (otrosAdmins === 0) {
      return NextResponse.json(
        { error: 'Sos el único administrador: nombrá otro antes de cerrar tu cuenta.' },
        { status: 409 }
      );
    }
  }

  const impedimento = await impedimentoParaBaja(usuario.id);
  if (impedimento) return NextResponse.json({ error: impedimento }, { status: 409 });

  await eliminarCuenta(usuario.id);
  await registrarEvento(null, 'CUENTA_ELIMINADA', usuario.id);
  const jar = await cookies();
  jar.delete('birteam_sesion');
  return NextResponse.json({ listo: true });
}
