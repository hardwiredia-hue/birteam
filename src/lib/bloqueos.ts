import { prisma } from './db';

/**
 * Ids con los que este usuario no se cruza: los que bloqueó y los que lo
 * bloquearon. Se usa para filtrar búsquedas y chats.
 */
export async function idsBloqueados(usuarioId: string): Promise<string[]> {
  const bloqueos = await prisma.bloqueo.findMany({
    where: { OR: [{ bloqueadorId: usuarioId }, { bloqueadoId: usuarioId }] },
    select: { bloqueadorId: true, bloqueadoId: true },
  });
  const otros = new Set<string>();
  for (const bloqueo of bloqueos) {
    otros.add(bloqueo.bloqueadorId === usuarioId ? bloqueo.bloqueadoId : bloqueo.bloqueadorId);
  }
  return [...otros];
}
