import Link from 'next/link';
import { redirect } from 'next/navigation';
import { usuarioActual } from '@/lib/auth';
import { Logotipo } from '@/components/marca';
import { FormularioEntrar } from './formulario';

export const metadata = { title: 'Entrar' };

export default async function PaginaEntrar() {
  const usuario = await usuarioActual();
  if (usuario) redirect('/panel');

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 py-10">
      <Link href="/">
        <Logotipo ancho={110} />
      </Link>

      <div className="flex flex-1 flex-col justify-center py-8">
        <h1 className="t-display text-[32px]">Entrá</h1>
        <p className="mt-2 text-tinta-2">Tu gente ya debe estar armando el próximo partido.</p>
        <FormularioEntrar />
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
