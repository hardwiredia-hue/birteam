import Link from 'next/link';
import { notFound } from 'next/navigation';
import { usuarioActual } from '@/lib/auth';
import { TEMAS } from '@/lib/ayuda';
import { CabeceraAyuda, ContactoAyuda, CuerpoArticulo, IconoTema } from '@/components/ayuda';

export function generateStaticParams() {
  return TEMAS.map((t) => ({ tema: t.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ tema: string }> }) {
  const { tema } = await params;
  const encontrado = TEMAS.find((t) => t.slug === tema);
  return encontrado ? { title: `${encontrado.titulo} · Ayuda`, description: encontrado.descripcion } : {};
}

/** Un tema de la ayuda: todos sus artículos en una página, con índice. */
export default async function TemaAyuda({ params }: { params: Promise<{ tema: string }> }) {
  const { tema: slug } = await params;
  const posicion = TEMAS.findIndex((t) => t.slug === slug);
  if (posicion < 0) notFound();
  const tema = TEMAS[posicion];
  const anterior = TEMAS[posicion - 1];
  const siguiente = TEMAS[posicion + 1];
  const usuario = await usuarioActual();

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-5 py-8 lg:py-10">
      <CabeceraAyuda conCuenta={!!usuario} />

      <div className="lg:flex lg:items-start lg:gap-12">
        {/* Índice del tema: arriba en el celular, al costado en la compu. */}
        <aside className="mb-8 lg:sticky lg:top-8 lg:mb-0 lg:w-56 lg:shrink-0">
          <Link href="/ayuda" className="t-rotulo inline-flex items-center gap-1.5 hover:text-tinta">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M13 8H3M7 4 3 8l4 4" />
            </svg>
            Centro de ayuda
          </Link>
          <nav className="mt-4 hidden flex-col gap-0.5 border-l border-borde lg:flex" aria-label="En este tema">
            {tema.articulos.map((a) => (
              <a key={a.id} href={`#${a.id}`} className="-ml-px border-l border-transparent py-1.5 pl-4 text-[13px] text-tinta-2 hover:border-verde hover:text-tinta">
                {a.titulo}
              </a>
            ))}
          </nav>
        </aside>

        <div className="min-w-0 flex-1 lg:max-w-2xl">
          <div className="flex items-center gap-3 text-verde-txt">
            <IconoTema icono={tema.icono} tam={26} />
            <p className="t-rotulo text-verde-txt">
              {tema.para === 'complejos' ? 'Para complejos' : tema.para === 'jugadores' ? 'Para jugar' : 'Para todos'}
            </p>
          </div>
          <h1 className="t-display mt-3 text-[30px] sm:text-[36px]">{tema.titulo}</h1>
          <p className="mt-2 text-sm text-tinta-2">{tema.descripcion}</p>

          <div className="mt-8 flex flex-col divide-y divide-borde border-t border-borde">
            {tema.articulos.map((articulo) => (
              <section key={articulo.id} id={articulo.id} className="ancla-ayuda flex flex-col gap-3 py-7">
                <h2 className="text-[18px] font-bold leading-snug text-tinta">
                  <a href={`#${articulo.id}`} className="hover:text-verde-txt">
                    {articulo.titulo}
                  </a>
                </h2>
                <CuerpoArticulo articulo={articulo} />
              </section>
            ))}
          </div>

          <nav className="mt-4 grid gap-3 border-t border-borde pt-6 sm:grid-cols-2" aria-label="Otros temas">
            {anterior ? (
              <Link href={`/ayuda/${anterior.slug}`} className="tarjeta flex flex-col gap-1 p-4 hover:border-borde-2">
                <span className="t-rotulo">Anterior</span>
                <span className="text-[15px] font-semibold">{anterior.titulo}</span>
              </Link>
            ) : (
              <span className="hidden sm:block" />
            )}
            {siguiente ? (
              <Link href={`/ayuda/${siguiente.slug}`} className="tarjeta flex flex-col gap-1 p-4 text-right hover:border-borde-2">
                <span className="t-rotulo">Siguiente</span>
                <span className="text-[15px] font-semibold">{siguiente.titulo}</span>
              </Link>
            ) : null}
          </nav>

          <div className="mt-8">
            <ContactoAyuda />
          </div>
        </div>
      </div>
    </main>
  );
}
