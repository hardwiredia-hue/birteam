import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { usuarioActual } from '@/lib/auth';
import { esquemaJugada, erroresDeZod } from '@/lib/validacion';

/**
 * Publicar una jugada: fotos (ya subidas a /api/archivos) + texto, atada a
 * un partido real o a un grupo si corresponde (ESQUEMA.md §3.8).
 * Permisos: la del partido la publica un participante; la del grupo, un
 * miembro; la suelta, cualquiera.
 */
export async function POST(request: Request) {
  const usuario = await usuarioActual();
  if (!usuario) return NextResponse.json({ error: 'Entrá para publicar.' }, { status: 401 });

  const cuerpo = await request.json().catch(() => null);
  const datos = esquemaJugada.safeParse(cuerpo);
  if (!datos.success) {
    return NextResponse.json(
      { error: 'Revisá la publicación.', detalles: erroresDeZod(datos.error) },
      { status: 400 }
    );
  }
  const d = datos.data;

  let grupoId = d.grupoId ?? null;

  if (d.partidoId) {
    const partido = await prisma.partido.findUnique({
      where: { id: d.partidoId },
      include: { participaciones: { where: { usuarioId: usuario.id }, select: { id: true } } },
    });
    if (!partido) return NextResponse.json({ error: 'Ese partido no existe.' }, { status: 404 });
    const participa = partido.organizadorId === usuario.id || partido.participaciones.length > 0;
    if (!participa) {
      return NextResponse.json({ error: 'Las jugadas del partido las suben los que jugaron.' }, { status: 403 });
    }
    // La jugada del partido hereda el grupo del partido.
    grupoId = partido.grupoId ?? grupoId;
  }

  if (grupoId) {
    const miembro = await prisma.miembroGrupo.findUnique({
      where: { grupoId_usuarioId: { grupoId, usuarioId: usuario.id } },
    });
    if (!miembro && !d.partidoId) {
      return NextResponse.json({ error: 'Las jugadas del grupo las suben sus miembros.' }, { status: 403 });
    }
  }

  const jugada = await prisma.jugada.create({
    data: {
      autorId: usuario.id,
      partidoId: d.partidoId ?? null,
      grupoId,
      texto: d.texto ?? null,
      fotos: JSON.stringify(d.fotos),
    },
  });

  return NextResponse.json({ id: jugada.id }, { status: 201 });
}
