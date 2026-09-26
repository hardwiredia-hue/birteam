import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { usuarioActual } from '@/lib/auth';
import { idsBloqueados } from '@/lib/bloqueos';
import { esquemaComentario, erroresDeZod } from '@/lib/validacion';

export async function GET(_request: Request, contexto: { params: Promise<{ id: string }> }) {
  const usuario = await usuarioActual();
  if (!usuario) return NextResponse.json({ error: 'Entrá primero.' }, { status: 401 });

  const { id } = await contexto.params;
  const ocultos = await idsBloqueados(usuario.id);
  const comentarios = await prisma.comentarioJugada.findMany({
    where: { jugadaId: id, ...(ocultos.length > 0 ? { autorId: { notIn: ocultos } } : {}) },
    include: { autor: { select: { nombre: true, usuario: true } } },
    orderBy: { creadoEn: 'asc' },
    take: 100,
  });

  return NextResponse.json({
    comentarios: comentarios.map((comentario) => ({
      id: comentario.id,
      texto: comentario.texto,
      autor: comentario.autor,
      mio: comentario.autorId === usuario.id,
    })),
  });
}

export async function POST(request: Request, contexto: { params: Promise<{ id: string }> }) {
  const usuario = await usuarioActual();
  if (!usuario) return NextResponse.json({ error: 'Entrá primero.' }, { status: 401 });

  const { id } = await contexto.params;
  const cuerpo = await request.json().catch(() => null);
  const datos = esquemaComentario.safeParse(cuerpo);
  if (!datos.success) {
    return NextResponse.json(
      { error: 'Revisá el comentario.', detalles: erroresDeZod(datos.error) },
      { status: 400 }
    );
  }

  const jugada = await prisma.jugada.findUnique({ where: { id }, select: { id: true } });
  if (!jugada) return NextResponse.json({ error: 'Esa jugada no existe.' }, { status: 404 });

  const comentario = await prisma.comentarioJugada.create({
    data: { jugadaId: id, autorId: usuario.id, texto: datos.data.texto },
  });
  return NextResponse.json({ id: comentario.id }, { status: 201 });
}
