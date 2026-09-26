import { prisma } from './db';
import { idsBloqueados } from './bloqueos';

export interface JugadaParaMostrar {
  id: string;
  texto: string | null;
  fotos: string[];
  creadoEn: string;
  autor: { nombre: string; usuario: string };
  mia: boolean;
  totalMeGusta: number;
  meGusta: boolean;
  totalComentarios: number;
  partido: { id: string; deporte: string; lugar: string } | null;
}

/** Jugadas listas para pintar, filtradas por grupo, partido o autor. */
export async function obtenerJugadas(
  usuarioId: string,
  filtro: { grupoId?: string; partidoId?: string; autorId?: string },
  limite = 20
): Promise<JugadaParaMostrar[]> {
  const ocultos = await idsBloqueados(usuarioId);
  const jugadas = await prisma.jugada.findMany({
    where: {
      ...(filtro.grupoId ? { grupoId: filtro.grupoId } : {}),
      ...(filtro.partidoId ? { partidoId: filtro.partidoId } : {}),
      ...(filtro.autorId ? { autorId: filtro.autorId } : {}),
      ...(ocultos.length > 0 ? { autorId: { notIn: ocultos } } : {}),
    },
    include: {
      autor: { select: { nombre: true, usuario: true } },
      meGusta: { select: { usuarioId: true } },
      _count: { select: { comentarios: true } },
    },
    orderBy: { creadoEn: 'desc' },
    take: limite,
  });

  // Los datos del partido, en una sola pasada.
  const idsPartidos = [...new Set(jugadas.map((j) => j.partidoId).filter(Boolean))] as string[];
  const partidos = idsPartidos.length
    ? await prisma.partido.findMany({
        where: { id: { in: idsPartidos } },
        include: { deporte: true },
      })
    : [];
  const porId = new Map(partidos.map((p) => [p.id, p]));

  return jugadas.map((jugada) => {
    const partido = jugada.partidoId ? porId.get(jugada.partidoId) : null;
    return {
      id: jugada.id,
      texto: jugada.texto,
      fotos: JSON.parse(jugada.fotos) as string[],
      creadoEn: jugada.creadoEn.toISOString(),
      autor: jugada.autor,
      mia: jugada.autorId === usuarioId,
      totalMeGusta: jugada.meGusta.length,
      meGusta: jugada.meGusta.some((m) => m.usuarioId === usuarioId),
      totalComentarios: jugada._count.comentarios,
      partido: partido
        ? { id: partido.id, deporte: partido.deporte.nombre, lugar: partido.lugarNombre }
        : null,
    };
  });
}
