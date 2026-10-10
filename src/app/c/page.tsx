import type { Metadata } from 'next';
import Link from 'next/link';
import { prisma } from '@/lib/db';
import { usuarioActual } from '@/lib/auth';
import { sitioEnConstruccion } from '@/lib/sitio';
import { PaginaConstruccion } from '@/components/construccion';
import { Logotipo } from '@/components/marca';
import { formatearPlata } from '@/lib/formato';
import { canchasVisibles, sitioPublico } from '@/lib/publico';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ ciudad?: string; deporte?: string }>;
}): Promise<Metadata> {
  const { ciudad, deporte } = await searchParams;
  const titulo = `Canchas${deporte ? ` de ${deporte}` : ''} para alquilar${ciudad ? ` en ${ciudad}` : ''}`;
  return {
    title: titulo,
    description: `${titulo}: turnos libres, precios y reseñas de jugadores. Reservá online en birteam.`,
    alternates: { canonical: `${sitioPublico()}/c` },
  };
}

/** Listado público de canchas, por ciudad. Indexable, sin cuenta. */
export default async function CanchasPublicas({
  searchParams,
}: {
  searchParams: Promise<{ ciudad?: string; deporte?: string }>;
}) {
  const { ciudad, deporte } = await searchParams;
  const usuario = await usuarioActual();
  if ((await sitioEnConstruccion()) && usuario?.rol !== 'ADMIN') return <PaginaConstruccion />;

  const canchas = await prisma.cancha.findMany({
    where: {
      ...canchasVisibles(),
      ...(ciudad ? { ciudad } : {}),
      ...(deporte ? { deporte: { nombre: deporte } } : {}),
    },
    include: { deporte: { select: { nombre: true } } },
    orderBy: [{ provincia: 'asc' }, { ciudad: 'asc' }, { nombre: 'asc' }],
    take: 300,
  });
  const porCiudad = new Map<string, typeof canchas>();
  for (const cancha of canchas) {
    const clave = [cancha.ciudad, cancha.provincia].filter(Boolean).join(', ') || 'Sin ciudad';
    porCiudad.set(clave, [...(porCiudad.get(clave) ?? []), cancha]);
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-5 px-5 py-8 lg:max-w-3xl">
      <Link href="/">
        <Logotipo ancho={100} />
      </Link>
      <header>
        <h1 className="t-display text-[28px]">
          Canchas{deporte ? ` de ${deporte}` : ''}
          {ciudad ? ` en ${ciudad}` : ''}
        </h1>
        <p className="mt-1 text-sm text-tinta-2">
          Turnos libres, precios y reseñas de los que jugaron. Reservás online y el complejo te
          confirma.
        </p>
        {ciudad || deporte ? (
          <Link href="/c" className="mt-2 inline-block text-xs font-semibold text-verde-txt">
            Ver todas
          </Link>
        ) : null}
      </header>

      {canchas.length === 0 ? (
        <p className="tarjeta p-5 text-sm text-tinta-2">Todavía no hay canchas publicadas acá.</p>
      ) : (
        [...porCiudad.entries()].map(([lugar, lista]) => (
          <section key={lugar} className="flex flex-col gap-2">
            <h2 className="t-rotulo">
              {lista[0].ciudad ? (
                <Link href={`/c?ciudad=${encodeURIComponent(lista[0].ciudad)}`}>{lugar}</Link>
              ) : (
                lugar
              )}{' '}
              · {lista.length}
            </h2>
            {lista.map((cancha) => (
              <Link key={cancha.id} href={`/c/${cancha.id}`} className="tarjeta flex items-center justify-between gap-3 p-4">
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold">{cancha.nombre}</span>
                  <span className="block truncate text-xs text-tinta-3">
                    {cancha.deporte.nombre} · {cancha.direccion}
                  </span>
                </span>
                <span className="shrink-0 text-xs font-semibold tabular text-naranja-txt">
                  {cancha.precioPorHora ? `${formatearPlata(cancha.precioPorHora)}/h` : ''}
                </span>
              </Link>
            ))}
          </section>
        ))
      )}

      <p className="mt-auto pt-6 text-center text-xs text-tinta-3">
        <Link href="/registro" className="font-semibold">
          ¿Tenés una cancha? Publicala en birteam
        </Link>
      </p>
    </main>
  );
}
