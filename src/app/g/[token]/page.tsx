import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { usuarioActual } from '@/lib/auth';
import { sitioEnConstruccion } from '@/lib/sitio';
import { PaginaConstruccion } from '@/components/construccion';
import { Logotipo } from '@/components/marca';
import { BotonUnirse } from './unirse';

export const metadata = { title: 'Te invitaron a un grupo' };
export const dynamic = 'force-dynamic';

/** El link de invitación al grupo: se abre sin cuenta, igual que el del partido. */
export default async function InvitacionGrupo({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const usuarioDeGuardia = await usuarioActual();
  if ((await sitioEnConstruccion()) && usuarioDeGuardia?.rol !== 'ADMIN') {
    return <PaginaConstruccion />;
  }


  const grupo = await prisma.grupo.findUnique({
    where: { tokenInvitacion: token },
    include: { deporte: true, _count: { select: { miembros: true } } },
  });
  if (!grupo) notFound();

  const usuario = await usuarioActual();
  const yaMiembro = usuario
    ? Boolean(
        await prisma.miembroGrupo.findUnique({
          where: { grupoId_usuarioId: { grupoId: grupo.id, usuarioId: usuario.id } },
        })
      )
    : false;
  const volver = `/g/${token}`;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 py-10">
      <Logotipo ancho={100} />

      <div className="flex flex-1 flex-col justify-center gap-5 py-8">
        <p className="t-rotulo text-verde-txt">Te invitaron a un grupo</p>

        <div className="tarjeta flex flex-col gap-3 p-5">
          <p className="t-rotulo text-verde-txt">{grupo.deporte.nombre}</p>
          <p className="t-display text-[28px]">{grupo.nombre}</p>
          {grupo.descripcion ? <p className="text-sm text-tinta-2">{grupo.descripcion}</p> : null}
          <p className="text-xs text-tinta-3">
            {grupo._count.miembros} {grupo._count.miembros === 1 ? 'miembro' : 'miembros'}
            {grupo.ciudad ? ` · ${grupo.ciudad}` : ''}
          </p>
        </div>

        {yaMiembro ? (
          <Link href={`/grupos/${grupo.id}`} className="btn btn-primario">
            Ya sos parte — abrir el grupo
          </Link>
        ) : usuario ? (
          <BotonUnirse token={token} grupoId={grupo.id} />
        ) : (
          <>
            <Link href={`/registro?volver=${encodeURIComponent(volver)}`} className="btn btn-primario">
              Sumate en 30 segundos
            </Link>
            <p className="text-center text-sm text-tinta-2">
              ¿Ya tenés cuenta?{' '}
              <Link href={`/entrar?volver=${encodeURIComponent(volver)}`} className="font-semibold text-verde-txt">
                Entrá y sumate
              </Link>
            </p>
          </>
        )}
      </div>

      <p className="t-rotulo text-center">birteam · ¿Querés jugar? Encontrá con quién.</p>
    </main>
  );
}
