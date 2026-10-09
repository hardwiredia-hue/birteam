import { prisma } from './db';

/** Preferencias que se pueden apagar desde Ajustes. */
export const PREFERENCIAS_AVISOS = ['avisosSociales', 'avisosRadar', 'avisosDesafios'] as const;
export type PreferenciaAviso = (typeof PREFERENCIAS_AVISOS)[number];

/** De una lista de usuarios, los que quieren recibir ese tipo de aviso. */
export async function quienesQuieren(usuarioIds: string[], preferencia: PreferenciaAviso) {
  const ids = [...new Set(usuarioIds)];
  if (ids.length === 0) return [];
  const usuarios = await prisma.usuario.findMany({
    where: { id: { in: ids }, [preferencia]: true },
    select: { id: true },
  });
  return usuarios.map((u) => u.id);
}

export async function quiere(usuarioId: string, preferencia: PreferenciaAviso) {
  return (await quienesQuieren([usuarioId], preferencia)).length > 0;
}
