import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { usuarioActual } from '@/lib/auth';
import { Chat } from '@/components/chat';

export const metadata = { title: 'Mensaje' };
export const dynamic = 'force-dynamic';

export default async function Conversacion({ params }: { params: Promise<{ usuario: string }> }) {
  const { usuario: alias } = await params;
  const yo = (await usuarioActual())!;

  const otro = await prisma.usuario.findUnique({
    where: { usuario: alias.toLowerCase() },
    select: { id: true, nombre: true, usuario: true, ciudad: true },
  });
  if (!otro) notFound();
  if (otro.id === yo.id) redirect('/mensajes');

  return (
    <div className="flex flex-col gap-4">
      <header className="flex items-center gap-3">
        <Link href="/mensajes" className="text-tinta-2" aria-label="Volver a mensajes">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M15 5l-7 7 7 7" /></svg>
        </Link>
        <Link href={`/jugadores/${otro.usuario}`} className="flex items-center gap-3">
          <span className="avatar h-9 w-9 text-xs">
            {otro.nombre.split(' ').map((parte) => parte[0]).slice(0, 2).join('').toUpperCase()}
          </span>
          <div>
            <p className="text-sm font-semibold">{otro.nombre}</p>
            <p className="t-rotulo">@{otro.usuario}{otro.ciudad ? ` · ${otro.ciudad}` : ''}</p>
          </div>
        </Link>
      </header>

      <Chat dmUsuarioId={otro.id} />
    </div>
  );
}
