import Link from 'next/link';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { usuarioActual } from '@/lib/auth';
import { Logotipo } from '@/components/marca';
import { FormularioRegistro } from './formulario';

export const metadata = { title: 'Creá tu cuenta' };

export default async function PaginaRegistro({
  searchParams,
}: {
  searchParams: Promise<{ puerta?: string }>;
}) {
  const usuario = await usuarioActual();
  if (usuario) redirect('/panel');

  const { puerta } = await searchParams;
  const deportes = await prisma.deporte.findMany({
    orderBy: { orden: 'asc' },
    select: { id: true, nombre: true },
  });

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 py-10">
      <Link href="/">
        <Logotipo ancho={110} />
      </Link>

      <div className="py-8">
        <h1 className="t-display text-[32px]">
          Creá tu cuenta
          <br />
          en 30 segundos
        </h1>
        <p className="mt-2 text-tinta-2">
          {puerta === 'grupo'
            ? 'Después armás tu grupo e invitás a tu gente.'
            : puerta === 'jugar'
              ? 'Después buscás partidos y jugadores cerca tuyo.'
              : 'Lo justo y necesario para empezar a jugar.'}
        </p>

        <FormularioRegistro deportes={deportes} />
      </div>

      <p className="text-center text-sm text-tinta-2">
        ¿Ya tenés cuenta?{' '}
        <Link href="/entrar" className="font-semibold text-verde-txt">
          Entrá
        </Link>
      </p>
    </main>
  );
}
