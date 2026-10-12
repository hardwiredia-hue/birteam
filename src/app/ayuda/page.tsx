import Link from 'next/link';
import { usuarioActual } from '@/lib/auth';
import { FRECUENTES, NOVEDADES, TEMAS, buscarArticulo } from '@/lib/ayuda';
import { BuscadorAyuda, type EntradaAyuda } from '@/components/buscador-ayuda';
import { CabeceraAyuda, ContactoAyuda, CuerpoArticulo, IconoTema, ListaNovedades } from '@/components/ayuda';

export const metadata = {
  title: 'Ayuda',
  description: 'Cómo funciona birteam: partidos, grupos, canchas, turnos, torneos y preguntas frecuentes.',
};

const SECCIONES = [
  { para: ['todos', 'jugadores'], titulo: 'Para jugar' },
  { para: ['complejos'], titulo: 'Para complejos y canchas' },
] as const;

/** Centro de ayuda: buscador, temas y preguntas frecuentes. Se abre sin cuenta. */
export default async function Ayuda() {
  const usuario = await usuarioActual();

  const entradas: EntradaAyuda[] = TEMAS.flatMap((tema) =>
    tema.articulos.map((a) => ({
      href: `/ayuda/${tema.slug}#${a.id}`,
      tema: tema.titulo,
      titulo: a.titulo,
      cuerpo: [...(a.pasos ?? []), ...a.texto].join(' '),
    }))
  );
  const frecuentes = FRECUENTES.map(([slug, id]) => buscarArticulo(slug, id)).filter((f) => f !== null);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-5 py-8 lg:py-10">
      <CabeceraAyuda conCuenta={!!usuario} />

      <div className="flex flex-col gap-2">
        <p className="t-rotulo text-verde-txt">Centro de ayuda</p>
        <h1 className="t-display text-[30px] sm:text-[38px]">¿En qué te damos una mano?</h1>
        <p className="text-sm text-tinta-2">Cómo funciona birteam, paso a paso. Buscá o elegí un tema.</p>
      </div>

      <BuscadorAyuda entradas={entradas}>
        {SECCIONES.map((seccion) => (
          <section key={seccion.titulo} className="flex flex-col gap-3">
            <h2 className="t-rotulo">{seccion.titulo}</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {TEMAS.filter((t) => (seccion.para as readonly string[]).includes(t.para)).map((tema) => (
                <Link
                  key={tema.slug}
                  href={`/ayuda/${tema.slug}`}
                  className="tarjeta group flex items-start gap-3.5 p-4 transition-colors hover:border-borde-2"
                >
                  <span className="mt-0.5 text-verde-txt">
                    <IconoTema icono={tema.icono} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] font-semibold group-hover:text-verde-txt">{tema.titulo}</span>
                    <span className="mt-0.5 block text-[13px] leading-snug text-tinta-2">{tema.descripcion}</span>
                    <span className="t-rotulo mt-2 block tabular">
                      {tema.articulos.length} {tema.articulos.length === 1 ? 'artículo' : 'artículos'}
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          </section>
        ))}

        <section className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between">
            <h2 className="t-rotulo">Novedades</h2>
            <Link href="/ayuda/novedades" className="text-xs font-semibold text-verde-txt">
              Ver todas
            </Link>
          </div>
          <ListaNovedades novedades={NOVEDADES.slice(0, 4)} />
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="t-rotulo">Preguntas frecuentes</h2>
          <div className="flex flex-col divide-y divide-borde border-y border-borde">
            {frecuentes.map(({ tema, articulo }) => (
              <details key={`${tema.slug}-${articulo.id}`} className="pregunta group">
                <summary className="flex cursor-pointer items-center justify-between gap-4 py-4 text-[15px] font-semibold">
                  {articulo.titulo}
                  <svg
                    className="shrink-0 text-tinta-3 transition-transform group-open:rotate-45"
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    aria-hidden
                  >
                    <path d="M8 3v10M3 8h10" />
                  </svg>
                </summary>
                <div className="pb-5">
                  <CuerpoArticulo articulo={articulo} />
                  <Link href={`/ayuda/${tema.slug}`} className="t-rotulo mt-4 inline-block hover:text-tinta">
                    Más sobre {tema.titulo}
                  </Link>
                </div>
              </details>
            ))}
          </div>
        </section>
      </BuscadorAyuda>

      <ContactoAyuda />
    </main>
  );
}
