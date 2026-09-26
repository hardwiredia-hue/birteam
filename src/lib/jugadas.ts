import type { Prisma } from '@prisma/client';
import { prisma } from './db';
import { idsBloqueados } from './bloqueos';

export interface JugadaParaMostrar {
  id: string;
  texto: string | null;
  fotos: string[];
  creadoEn: string;
  autor: { nombre: string; usuario: string; avatarUrl: string | null };
  mia: boolean;
  totalMeGusta: number;
  meGusta: boolean;
  totalComentarios: number;
  partido: { id: string; deporte: string; lugar: string } | null;
}

/**
 * El feed: primero tu red (los que seguís, tus grupos, vos), después lo
 * reciente de la comunidad (jugadas sin grupo: las de grupo son de sus
 * miembros). Bloqueados excluidos en todos lados.
 */
export async function obtenerFeed(usuarioId: string, limite = 20) {
  const [siguiendo, membresias, ocultos] = await Promise.all([
    prisma.seguimiento.findMany({ where: { seguidorId: usuarioId }, select: { seguidoId: true } }),
    prisma.miembroGrupo.findMany({ where: { usuarioId }, select: { grupoId: true } }),
    idsBloqueados(usuarioId),
  ]);
  const autoresRed = [...siguiendo.map((s) => s.seguidoId), usuarioId];
  const misGrupos = membresias.map((m) => m.grupoId);

  const red = await armarJugadas(
    usuarioId,
    {
      OR: [
        // De los que sigo: solo lo público (las de grupo son de sus miembros).
        { autorId: { in: autoresRed }, grupoId: null },
        ...(misGrupos.length > 0 ? [{ grupoId: { in: misGrupos } }] : []),
      ],
      ...(ocultos.length > 0 ? { autorId: { notIn: ocultos } } : {}),
    },
    limite
  );

  const yaVistas = red.map((j) => j.id);
  const comunidad = await armarJugadas(
    usuarioId,
    {
      grupoId: null,
      id: { notIn: yaVistas },
      autorId: { notIn: [...ocultos, usuarioId] },
    },
    limite
  );

  return { red, comunidad };
}

/** Jugadas listas para pintar, filtradas por grupo, partido o autor. */
export async function obtenerJugadas(
  usuarioId: string,
  filtro: { grupoId?: string; partidoId?: string; autorId?: string },
  limite = 20
): Promise<JugadaParaMostrar[]> {
  const ocultos = await idsBloqueados(usuarioId);
  return armarJugadas(
    usuarioId,
    {
      ...(filtro.grupoId ? { grupoId: filtro.grupoId } : {}),
      ...(filtro.partidoId ? { partidoId: filtro.partidoId } : {}),
      ...(filtro.autorId ? { autorId: filtro.autorId } : {}),
      ...(ocultos.length > 0 ? { autorId: { notIn: ocultos } } : {}),
    },
    limite
  );
}

/** Trae y da forma a las jugadas para cualquier filtro ya armado. */
async function armarJugadas(
  usuarioId: string,
  where: Prisma.JugadaWhereInput,
  limite: number
): Promise<JugadaParaMostrar[]> {
  const jugadas = await prisma.jugada.findMany({
    where,
    include: {
      autor: { select: { nombre: true, usuario: true, avatarUrl: true } },
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
