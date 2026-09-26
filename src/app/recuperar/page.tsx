import Link from 'next/link';
import { Logotipo } from '@/components/marca';
import { FormularioRecuperar } from './formulario';

export const metadata = { title: 'Recuperar contraseña' };

export default function Recuperar() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 py-10">
      <Link href="/">
        <Logotipo ancho={110} />
      </Link>
      <div className="flex flex-1 flex-col justify-center py-8">
        <h1 className="t-display text-[30px]">¿Olvidaste la<br />contraseña?</h1>
        <p className="mt-2 text-sm text-tinta-2">
          Pasa en los mejores equipos. Decinos tu email y te mandamos el link para crear una nueva.
        </p>
        <FormularioRecuperar />
      </div>
      <p className="text-center text-sm text-tinta-2">
        ¿La recordaste?{' '}
        <Link href="/entrar" className="font-semibold text-verde-txt">Entrá</Link>
      </p>
    </main>
  );
}
