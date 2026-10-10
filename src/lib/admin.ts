import { usuarioActual } from './auth';
import { prisma } from './db';

/** El usuario actual solo si es ADMIN; si no, null. */
export async function adminActual() {
  const usuario = await usuarioActual();
  return usuario?.rol === 'ADMIN' ? usuario : null;
}

/** Deja constancia de una acción del backoffice (nunca corta la acción si falla). */
export async function auditar(
  admin: { id: string; usuario: string },
  accion: string,
  objetivo?: string | null,
  detalle?: string | null
) {
  await prisma.registroAdmin
    .create({
      data: {
        adminId: admin.id,
        adminUsuario: admin.usuario,
        accion,
        objetivo: objetivo ?? null,
        detalle: detalle?.slice(0, 500) ?? null,
      },
    })
    .catch(() => {});
}
