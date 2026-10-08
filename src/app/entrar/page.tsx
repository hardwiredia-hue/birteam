import Link from 'next/link';
import { redirect } from 'next/navigation';
import { usuarioActual } from '@/lib/auth';
import { googleHabilitado } from '@/lib/google';
import { Logotipo } from '@/components/marca';
import { BotonGoogle, SeparadorO } from '@/components/boton-google';
import { FormularioEntrar } from './formulario';

export const metadata = { title: 'Entrar' };

function rutaSegura(volver?: string) {
  return volver && volver.startsWith('/') && !volver.startsWith('//') ? volver : null;
}

export default async function PaginaEntrar({
  searchParams,
}: {
  searchParams: Promise<{ volver?: string; google?: string }>;
}) {
  const { volver, google } = await searchParams;
  const destino = rutaSegura(volver);

  const usuario = await usuarioActual();
  if (usuario) redirect(destino ?? '/panel');

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 py-10">
      <Link href="/">
        <Logotipo ancho={110} />
      </Link>

      <div className="flex flex-1 flex-col justify-center py-8">
        <h1 className="t-display text-[32px]">Entrá</h1>
        <p className="mt-2 text-tinta-2">Tu gente ya debe estar armando el próximo partido.</p>
        {google ? (
          <p className="aviso-error mt-4">
            {google === 'vencido'
              ? 'El ingreso con Google venció. Probá de nuevo.'
              : google === 'sin-email'
                ? 'Tu cuenta de Google no tiene el email verificado.'
                : 'No pudimos completar el ingreso con Google. Probá de nuevo.'}
          </p>
        ) : null}
        {googleHabilitado() ? (
          <div className="mt-6">
            <BotonGoogle />
            <SeparadorO />
          </div>
        ) : null}
        <FormularioEntrar volver={destino} />
      </div>

      <p className="text-center text-sm text-tinta-2">
        ¿Todavía no tenés cuenta?{' '}
        <Link href="/registro" className="font-semibold text-verde-txt">
          Creala en 30 segundos
        </Link>
      </p>
    </main>
  );
}
