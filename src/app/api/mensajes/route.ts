import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { usuarioActual } from '@/lib/auth';
import { esquemaMensaje, erroresDeZod } from '@/lib/validacion';
import { idsBloqueados } from '@/lib/bloqueos';

/** ¿Puede este usuario leer y escribir en este chat? */
async function puedeParticipar(
  usuarioId: string,
  partidoId?: string | null,
  grupoId?: string | null,
  destinatarioId?: string | null
) {
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
  if (destinatarioId) {
    if (destinatarioId === usuarioId) return false;
    const otro = await prisma.usuario.findUnique({
      where: { id: destinatarioId },
      select: { id: true },
    });
    if (!otro) return null;
    // Bloqueados (en cualquier dirección) no se escriben.
    const ocultos = await idsBloqueados(usuarioId);
    return !ocultos.includes(destinatarioId);
  }
  return null;
}

export async function GET(request: Request) {
  const usuario = await usuarioActual();
  if (!usuario) return NextResponse.json({ error: 'Entrá primero.' }, { status: 401 });

  const parametros = new URL(request.url).searchParams;
  const partidoId = parametros.get('partidoId');
  const grupoId = parametros.get('grupoId');
  const destinatarioId = parametros.get('usuarioId');

  const permitido = await puedeParticipar(usuario.id, partidoId, grupoId, destinatarioId);
  if (permitido === null) return NextResponse.json({ error: 'Chat inexistente.' }, { status: 404 });
  if (!permitido) return NextResponse.json({ error: 'Este chat es de los que participan.' }, { status: 403 });

  // Los bloqueados no se leen entre sí.
  const ocultos = await idsBloqueados(usuario.id);
  const mensajes = await prisma.mensaje.findMany({
    where: {
      ...(partidoId
        ? { partidoId }
        : grupoId
          ? { grupoId }
          : {
              OR: [
                { autorId: usuario.id, destinatarioId: destinatarioId! },
                { autorId: destinatarioId!, destinatarioId: usuario.id },
              ],
            }),
      ...(ocultos.length > 0 ? { autorId: { notIn: ocultos } } : {}),
    },
    include: { autor: { select: { id: true, nombre: true, usuario: true } } },
    orderBy: { creadoEn: 'asc' },
    take: 100,
  });

  // Abrir la conversación directa marca como leído lo que te mandaron.
  if (destinatarioId) {
    await prisma.mensaje.updateMany({
      where: { autorId: destinatarioId, destinatarioId: usuario.id, leidoEn: null },
      data: { leidoEn: new Date() },
    });
  }

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
  const { texto, partidoId, grupoId, destinatarioId } = datos.data;

  const permitido = await puedeParticipar(usuario.id, partidoId, grupoId, destinatarioId);
  if (permitido === null) return NextResponse.json({ error: 'Chat inexistente.' }, { status: 404 });
  if (!permitido) return NextResponse.json({ error: 'Este chat es de los que participan.' }, { status: 403 });

  const mensaje = await prisma.mensaje.create({
    data: {
      texto,
      autorId: usuario.id,
      partidoId: partidoId ?? null,
      grupoId: grupoId ?? null,
      destinatarioId: destinatarioId ?? null,
    },
  });

  return NextResponse.json({ id: mensaje.id }, { status: 201 });
}
