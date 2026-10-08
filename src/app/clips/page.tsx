import Link from 'next/link';
import { redirect } from 'next/navigation';
import { usuarioActual } from '@/lib/auth';
import { sitioEnConstruccion } from '@/lib/sitio';
import { obtenerClips } from '@/lib/jugadas';
import { FeedClips } from '@/components/clips';
import { BarraInferior } from '@/components/barra-inferior';
import { PaginaConstruccion } from '@/components/construccion';

export const metadata = { title: 'Clips' };
export const dynamic = 'force-dynamic';

/** Feed vertical a pantalla completa: por eso vive fuera del marco angosto de la app. */
export default async function Clips() {
  const usuario = await usuarioActual();
  if (!usuario) redirect('/entrar');
  if (usuario.rol !== 'ADMIN' && (await sitioEnConstruccion())) {
    return <PaginaConstruccion />;
  }

  const clips = await obtenerClips(usuario.id);

  return (
    <div className="relative bg-black">
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center justify-between px-4 pt-5">
        <Link href="/jugadas" className="pointer-events-auto rounded-[6px] border border-white/25 bg-black/45 px-3 py-1.5 text-xs font-bold text-white">
          ← Jugadas
        </Link>
        <p className="t-rotulo mr-24 text-white/80">Clips</p>
      </div>

      {clips.length === 0 ? (
        <div className="flex h-dvh items-center justify-center px-8">
          <div className="tarjeta max-w-sm p-5 text-center">
            <p className="t-display text-[20px]">Todavía no hay clips</p>
            <p className="mt-2 text-sm text-tinta-2">
              Subí el primero: en Jugadas, publicá con un video (el gol, la atajada, el punto del
              partido) y aparece acá para toda la comunidad.
            </p>
            <Link href="/jugadas" className="btn btn-primario mt-4">
              Subir mi clip
            </Link>
          </div>
        </div>
      ) : (
        <FeedClips clips={clips} />
      )}

      <BarraInferior />
    </div>
  );
}
