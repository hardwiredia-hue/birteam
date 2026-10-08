import type { Prisma } from '@prisma/client';
import { prisma } from './db';
import { idsBloqueados } from './bloqueos';

export interface JugadaParaMostrar {
  id: string;
  texto: string | null;
  fotos: string[];
  videoUrl: string | null;
  creadoEn: string;
  autor: { nombre: string; usuario: string; avatarUrl: string | null };
  mia: boolean;
  totalMeGusta: number;
  meGusta: boolean;
  totalComentarios: number;
  /** Sin grupo: se puede compartir con link público. */
  publica: boolean;
  partido: { id: string; deporte: string; lugar: string } | null;
  torneo: { id: string; nombre: string; deporte: string } | null;
  cancha: { id: string; nombre: string; deporte: string } | null;
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

  // Los datos de lo compartido (partidos, torneos, canchas), en una sola pasada.
  const idsPartidos = [...new Set(jugadas.map((j) => j.partidoId).filter(Boolean))] as string[];
  const idsTorneos = [...new Set(jugadas.map((j) => j.torneoId).filter(Boolean))] as string[];
  const idsCanchas = [...new Set(jugadas.map((j) => j.canchaId).filter(Boolean))] as string[];
  const [partidos, torneos, canchas] = await Promise.all([
    idsPartidos.length
      ? prisma.partido.findMany({ where: { id: { in: idsPartidos } }, include: { deporte: true } })
      : [],
    idsTorneos.length
      ? prisma.torneo.findMany({ where: { id: { in: idsTorneos } }, include: { deporte: true } })
      : [],
    idsCanchas.length
      ? prisma.cancha.findMany({ where: { id: { in: idsCanchas } }, include: { deporte: true } })
      : [],
  ]);
  const porId = new Map(partidos.map((p) => [p.id, p]));
  const torneoPorId = new Map(torneos.map((t) => [t.id, t]));
  const canchaPorId = new Map(canchas.map((c) => [c.id, c]));

  return jugadas.map((jugada) => {
    const partido = jugada.partidoId ? porId.get(jugada.partidoId) : null;
    const torneo = jugada.torneoId ? torneoPorId.get(jugada.torneoId) : null;
    const cancha = jugada.canchaId ? canchaPorId.get(jugada.canchaId) : null;
    return {
      id: jugada.id,
      texto: jugada.texto,
      fotos: JSON.parse(jugada.fotos) as string[],
      videoUrl: jugada.videoUrl,
      creadoEn: jugada.creadoEn.toISOString(),
      autor: jugada.autor,
      mia: jugada.autorId === usuarioId,
      totalMeGusta: jugada.meGusta.length,
      meGusta: jugada.meGusta.some((m) => m.usuarioId === usuarioId),
      totalComentarios: jugada._count.comentarios,
      publica: jugada.grupoId === null,
      partido: partido
        ? { id: partido.id, deporte: partido.deporte.nombre, lugar: partido.lugarNombre }
        : null,
      torneo: torneo
        ? { id: torneo.id, nombre: torneo.nombre, deporte: torneo.deporte.nombre }
        : null,
      cancha: cancha
        ? { id: cancha.id, nombre: cancha.nombre, deporte: cancha.deporte.nombre }
        : null,
    };
  });
}

/** Clips: jugadas con video o fotos, de lo público y de tus grupos, para el feed vertical. */
export async function obtenerClips(usuarioId: string, limite = 30): Promise<JugadaParaMostrar[]> {
  const [membresias, ocultos] = await Promise.all([
    prisma.miembroGrupo.findMany({ where: { usuarioId }, select: { grupoId: true } }),
    idsBloqueados(usuarioId),
  ]);
  const misGrupos = membresias.map((m) => m.grupoId);

  return armarJugadas(
    usuarioId,
    {
      AND: [
        { OR: [{ videoUrl: { not: null } }, { fotos: { not: '[]' } }] },
        { OR: [{ grupoId: null }, ...(misGrupos.length > 0 ? [{ grupoId: { in: misGrupos } }] : [])] },
      ],
      ...(ocultos.length > 0 ? { autorId: { notIn: ocultos } } : {}),
    },
    limite
  );
}
