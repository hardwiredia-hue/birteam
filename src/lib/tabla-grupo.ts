import { prisma } from './db';
import { HORAS_VOTACION, VOTOS_MINIMOS, contarVotos } from './figura';

/**
 * La tabla del grupo: quién juega más con el grupo, con qué asistencia y
 * cuántas veces fue la figura. Solo partidos del grupo ya jugados y solo
 * los miembros de hoy.
 */

export interface FilaGrupo {
  id: string;
  nombre: string;
  usuario: string;
  avatarUrl: string | null;
  jugados: number;
  /** Jugados sobre las veces que dijo "Voy" (null si nunca se anotó). */
  asistencia: number | null;
  figuras: number;
}

export async function tablaDelGrupo(grupoId: string, ahora = new Date()) {
  const [partidos, miembros] = await Promise.all([
    prisma.partido.findMany({
      where: { grupoId, estado: 'JUGADO' },
      select: {
        id: true,
        fecha: true,
        participaciones: { where: { estado: 'VOY' }, select: { usuarioId: true, asistio: true } },
        votosFigura: { select: { elegidoId: true } },
      },
    }),
    prisma.miembroGrupo.findMany({
      where: { grupoId, usuario: { eliminadoEn: null } },
      select: { usuario: { select: { id: true, nombre: true, usuario: true, avatarUrl: true } } },
    }),
  ]);

  const filas = new Map<string, FilaGrupo & { anotados: number }>(
    miembros.map(({ usuario }) => [usuario.id, { ...usuario, jugados: 0, anotados: 0, asistencia: null, figuras: 0 }])
  );
  for (const partido of partidos) {
    for (const p of partido.participaciones) {
      const fila = filas.get(p.usuarioId);
      if (!fila) continue;
      fila.anotados++;
      if (p.asistio !== false) fila.jugados++;
    }
    // La figura cuenta cuando la votación cerró con el mínimo de votos.
    const cerrada = ahora.getTime() - partido.fecha.getTime() >= HORAS_VOTACION * 3600_000;
    const { ganadores, maximo } = contarVotos(partido.votosFigura);
    if (cerrada && maximo >= VOTOS_MINIMOS) {
      for (const id of ganadores) {
        const fila = filas.get(id);
        if (fila) fila.figuras++;
      }
    }
  }

  return {
    partidos: partidos.length,
    filas: [...filas.values()]
      .filter((f) => f.anotados > 0)
      .map(({ anotados, ...fila }) => ({ ...fila, asistencia: anotados > 0 ? Math.round((fila.jugados / anotados) * 100) : null }))
      .sort((a, b) => b.jugados - a.jugados || b.figuras - a.figuras || a.nombre.localeCompare(b.nombre)),
  };
}

/** Partidos ya jugados en los que estuvieron los dos. */
export async function jugaronJuntos(unoId: string, otroId: string) {
  if (unoId === otroId) return 0;
  const fue = (usuarioId: string) => ({
    // Sin marcar cuenta como que fue (en SQL, "distinto de false" dejaría afuera los null).
    participaciones: { some: { usuarioId, estado: 'VOY', OR: [{ asistio: true }, { asistio: null }] } },
  });
  return prisma.partido.count({ where: { estado: 'JUGADO', AND: [fue(unoId), fue(otroId)] } });
}

/**
 * Con quiénes jugás más (partidos ya jugados, los últimos 100), para
 * invitarlos de un toque al armar un partido. Sin bloqueados ni cuentas
 * cerradas.
 */
export async function companerosFrecuentes(usuarioId: string, limite = 12) {
  const fue = { estado: 'VOY', OR: [{ asistio: true }, { asistio: null }] };
  const mios = await prisma.participacion.findMany({
    where: { usuarioId, ...fue, partido: { estado: 'JUGADO' } },
    select: { partidoId: true },
    orderBy: { partido: { fecha: 'desc' } },
    take: 100,
  });
  if (mios.length === 0) return [];
  const bloqueos = await prisma.bloqueo.findMany({
    where: { OR: [{ bloqueadorId: usuarioId }, { bloqueadoId: usuarioId }] },
    select: { bloqueadorId: true, bloqueadoId: true },
  });
  const ocultos = [usuarioId, ...bloqueos.flatMap((b) => [b.bloqueadorId, b.bloqueadoId])];
  const conteo = await prisma.participacion.groupBy({
    by: ['usuarioId'],
    where: { partidoId: { in: mios.map((m) => m.partidoId) }, usuarioId: { notIn: ocultos }, ...fue },
    _count: { _all: true },
    orderBy: { _count: { usuarioId: 'desc' } },
    take: limite * 2,
  });
  const usuarios = await prisma.usuario.findMany({
    where: { id: { in: conteo.map((c) => c.usuarioId) }, eliminadoEn: null },
    select: { id: true, nombre: true, usuario: true },
  });
  const porId = new Map(usuarios.map((u) => [u.id, u]));
  return conteo
    .map((c) => ({ ...porId.get(c.usuarioId)!, veces: c._count._all }))
    .filter((c) => c.id)
    .slice(0, limite);
}
