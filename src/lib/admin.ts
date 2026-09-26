import { usuarioActual } from './auth';

/** El usuario actual solo si es ADMIN; si no, null. */
export async function adminActual() {
  const usuario = await usuarioActual();
  return usuario?.rol === 'ADMIN' ? usuario : null;
}
