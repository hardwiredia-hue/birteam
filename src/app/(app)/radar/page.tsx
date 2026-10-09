import Link from 'next/link';
import { prisma } from '@/lib/db';
import { usuarioActual } from '@/lib/auth';
import { formatearPlata } from '@/lib/formato';
import { distanciaKm, formatearDistancia } from '@/lib/geo';
import { cuandoEmpieza, ofertasVigentes, rotuloDia } from '@/lib/reservas';
import { PedirOferta } from './pedir';

export const metadata = { title: 'Radar de turnos libres' };
export const dynamic = 'force-dynamic';

/**
 * Turnos que los complejos tienen libres y ofrecen más baratos. Todo sale de
 * la base en el momento: si alguien lo pidió, ya no aparece.
 */
export default async function Radar({
  searchParams,
}: {
  searchParams: Promise<{ deporte?: string; orden?: string }>;
}) {
  const { deporte: slug, orden } = await searchParams;
  const usuario = (await usuarioActual())!;

  const deportes = await prisma.deporte.findMany({
    orderBy: { orden: 'asc' },
    select: { id: true, nombre: true, slug: true },
  });
  const deporte = deportes.find((d) => d.slug === slug) ?? null;
  const ofertas = await ofertasVigentes({ deporteId: deporte?.id });

  const conUbicacion = usuario.latitud != null && usuario.longitud != null;
  const lista = ofertas
    .map((oferta) => ({
      ...oferta,
      distancia:
        conUbicacion && oferta.cancha.latitud != null && oferta.cancha.longitud != null
          ? distanciaKm(usuario.latitud!, usuario.longitud!, oferta.cancha.latitud, oferta.cancha.longitud)
          : null,
    }));
  if (orden === 'cerca' && conUbicacion) {
    lista.sort((a, b) => (a.distancia ?? Infinity) - (b.distancia ?? Infinity));
  }
  const propias = await prisma.cancha.count({ where: { duenoId: usuario.id } });

  const enlace = (cambios: { deporte?: string | null; orden?: string | null }) => {
    const parametros = new URLSearchParams();
    const d = cambios.deporte === undefined ? slug : cambios.deporte;
    const o = cambios.orden === undefined ? orden : cambios.orden;
    if (d) parametros.set('deporte', d);
    if (o) parametros.set('orden', o);
    const texto = parametros.toString();
    return texto ? `/radar?${texto}` : '/radar';
  };

  return (
    <div className="flex flex-col gap-5">
      <header>
        <p className="t-rotulo text-naranja-txt">Turnos libres con descuento</p>
        <h1 className="t-pantalla mt-1">Radar</h1>
        <p className="mt-1 text-sm text-tinta-2">
          Los complejos publican acá los turnos que les quedaron libres, más baratos. Lo pedís
          y el complejo lo confirma.
        </p>
      </header>

      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        <Link href={enlace({ deporte: null })} className={!deporte ? 'chip-sel chip-sel-activo shrink-0' : 'chip-sel shrink-0'}>
          Todos
        </Link>
        {deportes.map((d) => (
          <Link
            key={d.id}
            href={enlace({ deporte: d.slug })}
            className={deporte?.id === d.id ? 'chip-sel chip-sel-activo shrink-0' : 'chip-sel shrink-0'}
          >
            {d.nombre}
          </Link>
        ))}
      </div>

      {conUbicacion && lista.length > 1 ? (
        <div className="flex gap-3 text-xs font-semibold">
          <Link href={enlace({ orden: null })} className={orden !== 'cerca' ? 'text-verde-txt' : 'text-tinta-3'}>
            Lo más pronto
          </Link>
          <Link href={enlace({ orden: 'cerca' })} className={orden === 'cerca' ? 'text-verde-txt' : 'text-tinta-3'}>
            Lo más cerca
          </Link>
        </div>
      ) : null}

      {lista.length === 0 ? (
        <div className="tarjeta flex flex-col gap-3 p-5">
          <p className="text-sm text-tinta-2">
            Ahora no hay turnos en el Radar{deporte ? ` de ${deporte.nombre}` : ''}. Cuando un
            complejo publique uno libre con descuento te avisamos, si jugás ese deporte en su
            ciudad.
          </p>
          <Link href="/explorar?tab=canchas" className="btn btn-secundario btn-sm self-start">
            Ver todas las canchas
          </Link>
        </div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {lista.map((oferta) => (
            <article key={oferta.id} className="tarjeta flex flex-col gap-3 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="t-rotulo text-verde-txt">{oferta.cancha.deporte}</p>
                  <Link href={`/canchas/${oferta.cancha.id}`} className="mt-0.5 block truncate text-sm font-semibold">
                    {oferta.cancha.nombre}
                  </Link>
                  <p className="truncate text-xs text-tinta-3">
                    {oferta.cancha.direccion}
                    {oferta.cancha.ciudad ? ` · ${oferta.cancha.ciudad}` : ''}
                    {oferta.distancia != null ? ` · ${formatearDistancia(oferta.distancia)}` : ''}
                  </p>
                </div>
                {oferta.descuento ? (
                  <span
                    className="shrink-0 rounded-[6px] px-2 py-1 text-sm font-bold tabular"
                    style={{ background: 'var(--naranja-txt)', color: 'var(--fondo)' }}
                  >
                    −{oferta.descuento}%
                  </span>
                ) : null}
              </div>
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="t-display text-[20px]">
                    {rotuloDia(oferta.fecha)} · {oferta.hora}
                  </p>
                  <p className="text-xs font-semibold text-naranja-txt">
                    Empieza {cuandoEmpieza(oferta.inicio, oferta.fecha, oferta.hora)}
                  </p>
                </div>
                <div className="text-right">
                  {oferta.precioOriginal ? (
                    <p className="text-xs text-tinta-3 line-through">{formatearPlata(oferta.precioOriginal)}</p>
                  ) : null}
                  <p className="t-display text-[20px] text-verde-txt tabular">
                    {formatearPlata(oferta.precioOferta)}
                  </p>
                </div>
              </div>
              {oferta.cancha.duenoId === usuario.id ? (
                <Link
                  href={`/canchas/${oferta.cancha.id}?fecha=${oferta.fecha}&hora=${oferta.hora}`}
                  className="btn btn-secundario btn-sm"
                >
                  Es tuya · editar la oferta
                </Link>
              ) : (
                <PedirOferta canchaId={oferta.cancha.id} fecha={oferta.fecha} hora={oferta.hora} />
              )}
            </article>
          ))}
        </div>
      )}

      {propias > 0 ? (
        <p className="text-xs text-tinta-3">
          ¿Te quedó un turno libre? Publicalo desde la grilla de tu cancha: tocás el horario y
          elegís el descuento.
        </p>
      ) : null}
    </div>
  );
}
