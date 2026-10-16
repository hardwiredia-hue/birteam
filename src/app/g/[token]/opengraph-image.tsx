import { vistaGrupo } from '@/lib/vista-previa';
import { TAMANO, imagenVistaPrevia } from '@/lib/imagen-vista-previa';

export const alt = 'Grupo en birteam';
export const size = TAMANO;
export const contentType = 'image/png';

/** La imagen que se ve al compartir el link (WhatsApp, redes). */
export default async function Imagen({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return imagenVistaPrevia(await vistaGrupo(token));
}
