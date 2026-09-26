import { prisma } from './db';
import { idsBloqueados } from './bloqueos';

// El puntaje es deliberadamente simple y transparente: premia jugar de
// verdad (lista pasada) y organizar. Nada de likes ni ruido social.
export const PUNTOS_POR_JUGAR = 3;
export const PUNTOS_POR_ORGANIZAR = 2;

export interface FilaRanking {
  posicion: number;
  usuario: {
    id: string;
    nombre: string;
    usuario: string;
    ciudad: string | null;
    avatarUrl: string | null;
  };
  jugados: number;
  organizados: number;
  puntos: number;
}

/**
 * Ranking de jugadores: por deporte (opcional) y por ciudad (opcional).
 * Devuelve el top 20 y tu propia fila aunque estés fuera del top.
 */
export async function calcularRanking(
  usuarioId: string,
  opciones: { deporteSlug?: string; soloCiudad?: string | null } = {}
): Promise<{ filas: FilaRanking[]; mia: FilaRanking | null }> {
  const filtroDeporte = opciones.deporteSlug ? { deporte: { slug: opciones.deporteSlug } } : {};

  const [jugadosPor, organizadosPor, ocultos] = await Promise.all([
    prisma.participacion.groupBy({
      by: ['usuarioId'],
      where: { asistio: true, partido: { estado: 'JUGADO', ...filtroDeporte } },
      _count: { _all: true },
    }),
    prisma.partido.groupBy({
      by: ['organizadorId'],
      where: { estado: 'JUGADO', ...filtroDeporte },
      _count: { _all: true },
    }),
    idsBloqueados(usuarioId),
  ]);

  const tabla = new Map<string, { jugados: number; organizados: number }>();
  for (const fila of jugadosPor) {
    tabla.set(fila.usuarioId, { jugados: fila._count._all, organizados: 0 });
  }
  for (const fila of organizadosPor) {
    const entrada = tabla.get(fila.organizadorId) ?? { jugados: 0, organizados: 0 };
    entrada.organizados = fila._count._all;
    tabla.set(fila.organizadorId, entrada);
  }

  const ids = [...tabla.keys()].filter((id) => !ocultos.includes(id));
  if (ids.length === 0) return { filas: [], mia: null };

  const usuarios = await prisma.usuario.findMany({
    where: { id: { in: ids }, ...(opciones.soloCiudad ? { ciudad: opciones.soloCiudad } : {}) },
    select: { id: true, nombre: true, usuario: true, ciudad: true, avatarUrl: true },
  });

  const ordenadas = usuarios
    .map((usuario) => {
      const entrada = tabla.get(usuario.id)!;
      return {
        usuario,
        jugados: entrada.jugados,
        organizados: entrada.organizados,
        puntos: entrada.jugados * PUNTOS_POR_JUGAR + entrada.organizados * PUNTOS_POR_ORGANIZAR,
      };
    })
    .sort((a, b) => b.puntos - a.puntos || b.jugados - a.jugados)
    .map((fila, indice) => ({ ...fila, posicion: indice + 1 }));

  return {
    filas: ordenadas.slice(0, 20),
    mia: ordenadas.find((fila) => fila.usuario.id === usuarioId) ?? null,
  };
}

/** Estadísticas enriquecidas de un jugador para el perfil. */
export async function estadisticasJugador(usuarioId: string) {
  const [asistidas, organizados, jugadasPublicadas] = await Promise.all([
    prisma.participacion.findMany({
      where: { usuarioId, asistio: true, partido: { estado: 'JUGADO' } },
      include: { partido: { include: { deporte: true } } },
    }),
    prisma.partido.count({ where: { organizadorId: usuarioId, estado: 'JUGADO' } }),
    prisma.jugada.count({ where: { autorId: usuarioId } }),
  ]);

  const porDeporte = new Map<string, number>();
  for (const participacion of asistidas) {
    const nombre = participacion.partido.deporte.nombre;
    porDeporte.set(nombre, (porDeporte.get(nombre) ?? 0) + 1);
  }

  return {
    porDeporte: [...porDeporte.entries()]
      .map(([deporte, jugados]) => ({ deporte, jugados }))
      .sort((a, b) => b.jugados - a.jugados),
    organizados,
    jugadasPublicadas,
    puntos: asistidas.length * PUNTOS_POR_JUGAR + organizados * PUNTOS_POR_ORGANIZAR,
  };
}
