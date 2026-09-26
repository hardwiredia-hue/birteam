import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { prisma } from '@/lib/db';
import { enviarCorreo } from '@/lib/correo';

/**
 * Pedir el link para restablecer la contraseña. La respuesta es siempre la
 * misma exista o no la cuenta: no regalamos qué emails están registrados.
 */
export async function POST(request: Request) {
  const cuerpo = await request.json().catch(() => ({}));
  const email = String(cuerpo.email ?? '').trim().toLowerCase();
  const respuesta = NextResponse.json({ listo: true });
  if (!email.includes('@')) return respuesta;

  const usuario = await prisma.usuario.findUnique({ where: { email } });
  if (!usuario) return respuesta;

  // Freno anti abuso: hasta 3 pedidos por hora por cuenta.
  const haceUnaHora = new Date(Date.now() - 3600 * 1000);
  const recientes = await prisma.tokenRecuperacion.count({
    where: { usuarioId: usuario.id, creadoEn: { gte: haceUnaHora } },
  });
  if (recientes >= 3) return respuesta;

  const token = randomBytes(32).toString('hex');
  await prisma.tokenRecuperacion.create({
    data: { token, usuarioId: usuario.id, expiraEn: new Date(Date.now() + 3600 * 1000) },
  });

  const origen = new URL(request.url).origin;
  await enviarCorreo({
    para: usuario.email,
    asunto: 'Restablecé tu contraseña de birteam',
    texto: [
      `Hola, ${usuario.nombre.split(' ')[0]}.`,
      '',
      'Pediste restablecer tu contraseña de birteam. Entrá a este link',
      '(vale por 1 hora):',
      '',
      `${origen}/restablecer/${token}`,
      '',
      'Si no fuiste vos, ignorá este correo: tu cuenta sigue como estaba.',
      '',
      '— birteam · ¿Querés jugar? Encontrá con quién.',
    ].join('\n'),
  });

  return respuesta;
}
