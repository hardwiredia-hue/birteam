import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { crearSesion, verificarClave } from '@/lib/auth';
import { esquemaEntrar, erroresDeZod } from '@/lib/validacion';

export async function POST(request: Request) {
  const cuerpo = await request.json().catch(() => null);
  const datos = esquemaEntrar.safeParse(cuerpo);
  if (!datos.success) {
    return NextResponse.json(
      { error: 'Revisá los datos marcados.', detalles: erroresDeZod(datos.error) },
      { status: 400 }
    );
  }
  const { usuarioOEmail, clave } = datos.data;

  const usuario = await prisma.usuario.findFirst({
    where: { OR: [{ usuario: usuarioOEmail }, { email: usuarioOEmail }] },
  });
  // Cuenta solo-Google: no tiene contraseña para comparar.
  if (usuario && !usuario.hashClave) {
    return NextResponse.json(
      { error: 'Esa cuenta entra con Google. Usá el botón "Continuar con Google".' },
      { status: 401 }
    );
  }
  // Mismo mensaje exista o no la cuenta: no regalamos qué usuarios hay.
  if (!usuario || !usuario.hashClave || !(await verificarClave(clave, usuario.hashClave))) {
    return NextResponse.json(
      { error: 'Usuario o contraseña incorrectos.' },
      { status: 401 }
    );
  }

  await crearSesion(usuario.id);
  return NextResponse.json({ id: usuario.id, usuario: usuario.usuario });
}
