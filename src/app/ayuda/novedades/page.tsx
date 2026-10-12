import Link from 'next/link';
import { usuarioActual } from '@/lib/auth';
import { NOVEDADES } from '@/lib/ayuda';
import { CabeceraAyuda, ContactoAyuda, ListaNovedades } from '@/components/ayuda';

export const metadata = { title: 'Novedades · Ayuda', description: 'Lo nuevo en birteam.' };

/** Todo lo nuevo en birteam, lo más reciente primero. */
export default async function Novedades() {
  const usuario = await usuarioActual();
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-5 py-8 lg:py-10">
      <CabeceraAyuda conCuenta={!!usuario} />
      <div className="flex flex-col gap-2">
        <Link href="/ayuda" className="t-rotulo inline-flex items-center gap-1.5 hover:text-tinta">
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M13 8H3M7 4 3 8l4 4" />
          </svg>
          Centro de ayuda
        </Link>
        <h1 className="t-display text-[30px] sm:text-[36px]">Novedades</h1>
        <p className="text-sm text-tinta-2">Lo nuevo en birteam, lo más reciente primero.</p>
      </div>
      <ListaNovedades novedades={NOVEDADES} />
      <ContactoAyuda />
    </main>
  );
}
