import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { usuarioActual } from '@/lib/auth';
import { esquemaLogo, erroresDeZod } from '@/lib/validacion';

/** Poner o sacar el logo del grupo. Solo administradores. */
export async function PUT(request: Request, contexto: { params: Promise<{ id: string }> }) {
  const usuario = await usuarioActual();
  if (!usuario) return NextResponse.json({ error: 'Entrá primero.' }, { status: 401 });
  const { id } = await contexto.params;
  const membresia = await prisma.miembroGrupo.findUnique({
    where: { grupoId_usuarioId: { grupoId: id, usuarioId: usuario.id } },
  });
  if (!membresia) return NextResponse.json({ error: 'Ese grupo no existe.' }, { status: 404 });
  if (membresia.rol !== 'ADMIN') {
    return NextResponse.json({ error: 'El logo lo cambian los administradores.' }, { status: 403 });
  }
  const datos = esquemaLogo.safeParse(await request.json().catch(() => null));
  if (!datos.success) {
    return NextResponse.json({ error: 'Revisá la imagen.', detalles: erroresDeZod(datos.error) }, { status: 400 });
  }
  await prisma.grupo.update({
    where: { id },
    data: { fotoUrl: datos.data.logo ? `/api/archivos/${datos.data.logo}` : null },
  });
  return NextResponse.json({ listo: true });
}
