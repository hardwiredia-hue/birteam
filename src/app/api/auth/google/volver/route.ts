import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { randomUUID } from 'crypto';
import { prisma } from '@/lib/db';
import { crearSesion } from '@/lib/auth';
import { canjearCodigo, googleHabilitado } from '@/lib/google';

/**
 * Vuelta de Google. Tres caminos:
 * 1. Cuenta ya vinculada (googleId) → entra.
 * 2. Cuenta con el mismo email verificado → se vincula y entra.
 * 3. Nadie con ese email → completa sus datos en /registro/completar.
 */
export async function GET(request: Request) {
  const aEntrar = (motivo: string) =>
    NextResponse.redirect(new URL(`/entrar?google=${motivo}`, request.url));

  if (!googleHabilitado()) return aEntrar('apagado');

  const parametros = new URL(request.url).searchParams;
  const codigo = parametros.get('code');
  const estado = parametros.get('state');
  const jar = await cookies();
  const estadoGuardado = jar.get('birteam_google_estado')?.value;
  jar.delete('birteam_google_estado');

  if (!codigo || !estado || !estadoGuardado || estado !== estadoGuardado) {
    return aEntrar('error');
  }

  const perfil = await canjearCodigo(request, codigo).catch(() => null);
  if (!perfil) return aEntrar('error');

  // 1. Ya vinculada.
  const vinculada = await prisma.usuario.findUnique({ where: { googleId: perfil.googleId } });
  if (vinculada) {
    await crearSesion(vinculada.id);
    return NextResponse.redirect(new URL('/panel', request.url));
  }

  // 2. Mismo email verificado: se vincula solo.
  if (perfil.emailVerificado) {
    const porEmail = await prisma.usuario.findUnique({ where: { email: perfil.email } });
    if (porEmail) {
      await prisma.usuario.update({
        where: { id: porEmail.id },
        data: { googleId: perfil.googleId },
      });
      await crearSesion(porEmail.id);
      return NextResponse.redirect(new URL('/panel', request.url));
    }
  }
  if (!perfil.emailVerificado) return aEntrar('sin-email');

  // 3. Nueva: queda a medio camino hasta que complete sus datos.
  const token = randomUUID();
  await prisma.tokenGoogle.deleteMany({ where: { googleId: perfil.googleId } });
  await prisma.tokenGoogle.create({
    data: {
      token,
      googleId: perfil.googleId,
      email: perfil.email,
      nombre: perfil.nombre,
      foto: perfil.foto,
      expiraEn: new Date(Date.now() + 30 * 60 * 1000),
    },
  });
  return NextResponse.redirect(new URL(`/registro/completar?token=${token}`, request.url));
}
