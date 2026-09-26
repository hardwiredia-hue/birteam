import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { usuarioActual } from '@/lib/auth';
import { esquemaMensaje, erroresDeZod } from '@/lib/validacion';

/** ¿Puede este usuario leer y escribir en este chat? */
async function puedeParticipar(usuarioId: string, partidoId?: string | null, grupoId?: string | null) {
  if (partidoId) {
    const partido = await prisma.partido.findUnique({
      where: { id: partidoId },
      select: { organizadorId: true, participaciones: { where: { usuarioId }, select: { id: true } } },
    });
    if (!partido) return null;
    return partido.organizadorId === usuarioId || partido.participaciones.length > 0;
  }
  if (grupoId) {
    const miembro = await prisma.miembroGrupo.findUnique({
      where: { grupoId_usuarioId: { grupoId, usuarioId } },
    });
    return Boolean(miembro);
  }
  return null;
}

export async function GET(request: Request) {
  const usuario = await usuarioActual();
  if (!usuario) return NextResponse.json({ error: 'Entrá primero.' }, { status: 401 });

  const parametros = new URL(request.url).searchParams;
  const partidoId = parametros.get('partidoId');
  const grupoId = parametros.get('grupoId');

  const permitido = await puedeParticipar(usuario.id, partidoId, grupoId);
  if (permitido === null) return NextResponse.json({ error: 'Chat inexistente.' }, { status: 404 });
  if (!permitido) return NextResponse.json({ error: 'Este chat es de los que participan.' }, { status: 403 });

  const mensajes = await prisma.mensaje.findMany({
    where: partidoId ? { partidoId } : { grupoId },
    include: { autor: { select: { id: true, nombre: true, usuario: true } } },
    orderBy: { creadoEn: 'asc' },
    take: 100,
  });

  return NextResponse.json({
    mensajes: mensajes.map((mensaje) => ({
      id: mensaje.id,
      texto: mensaje.texto,
      creadoEn: mensaje.creadoEn,
      autor: mensaje.autor,
      mio: mensaje.autorId === usuario.id,
    })),
  });
}

export async function POST(request: Request) {
  const usuario = await usuarioActual();
  if (!usuario) return NextResponse.json({ error: 'Entrá primero.' }, { status: 401 });

  const cuerpo = await request.json().catch(() => null);
  const datos = esquemaMensaje.safeParse(cuerpo);
  if (!datos.success) {
    return NextResponse.json(
      { error: 'Revisá el mensaje.', detalles: erroresDeZod(datos.error) },
      { status: 400 }
    );
  }
  const { texto, partidoId, grupoId } = datos.data;

  const permitido = await puedeParticipar(usuario.id, partidoId, grupoId);
  if (permitido === null) return NextResponse.json({ error: 'Chat inexistente.' }, { status: 404 });
  if (!permitido) return NextResponse.json({ error: 'Este chat es de los que participan.' }, { status: 403 });

  const mensaje = await prisma.mensaje.create({
    data: {
      texto,
      autorId: usuario.id,
      partidoId: partidoId ?? null,
      grupoId: grupoId ?? null,
    },
  });

  return NextResponse.json({ id: mensaje.id }, { status: 201 });
}
