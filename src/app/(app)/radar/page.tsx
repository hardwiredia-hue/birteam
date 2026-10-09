import Link from 'next/link';
import { prisma } from '@/lib/db';
import { usuarioActual } from '@/lib/auth';
import { formatearPlata } from '@/lib/formato';
import { distanciaKm, formatearDistancia } from '@/lib/geo';
import { cuandoEmpieza, diaDeSemana, ofertasVigentes, proximosDias, rotuloDia } from '@/lib/reservas';
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
  searchParams: Promise<{
    deporte?: string;
    orden?: string;
    cuando?: string;
    descuento?: string;
    hasta?: string;
  }>;
}) {
  const { deporte: slug, orden, cuando, descuento: descuentoCrudo, hasta: hastaCrudo } = await searchParams;
  const descuentoMinimo = Number(descuentoCrudo) || 0;
  const precioMaximo = Number(hastaCrudo) || 0;
  const [hoy, manana] = proximosDias(2);
  const usuario = (await usuarioActual())!;

  const deportes = await prisma.deporte.findMany({
    orderBy: { orden: 'asc' },
    select: { id: true, nombre: true, slug: true },
  });
  const deporte = deportes.find((d) => d.slug === slug) ?? null;
  const ofertas = await ofertasVigentes({ deporteId: deporte?.id });

  const conUbicacion = usuario.latitud != null && usuario.longitud != null;
  const lista = ofertas
    .filter((oferta) => {
      if (cuando === 'hoy' && oferta.fecha !== hoy) return false;
      if (cuando === 'manana' && oferta.fecha !== manana) return false;
      if (cuando === 'finde' && ![0, 5, 6].includes(diaDeSemana(oferta.fecha))) return false;
      if (descuentoMinimo && (oferta.descuento ?? 0) < descuentoMinimo) return false;
      if (precioMaximo && oferta.precioOferta > precioMaximo) return false;
      return true;
    })
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

  type Filtros = { deporte?: string; orden?: string; cuando?: string; descuento?: string; hasta?: string };
  const actuales: Filtros = { deporte: slug, orden, cuando, descuento: descuentoCrudo, hasta: hastaCrudo };
  const enlace = (cambios: { [K in keyof Filtros]?: string | null }) => {
    const parametros = new URLSearchParams();
    for (const clave of ['deporte', 'orden', 'cuando', 'descuento', 'hasta'] as const) {
      const valor = cambios[clave] === undefined ? actuales[clave] : cambios[clave];
      if (valor) parametros.set(clave, valor);
    }
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

      <div className="flex flex-wrap gap-2">
        {[
          { valor: null, rotulo: 'Cuando sea' },
          { valor: 'hoy', rotulo: 'Hoy' },
          { valor: 'manana', rotulo: 'Mañana' },
          { valor: 'finde', rotulo: 'Finde' },
        ].map((opcion) => (
          <Link
            key={opcion.rotulo}
            href={enlace({ cuando: opcion.valor })}
            className={(cuando ?? null) === opcion.valor ? 'chip-sel chip-sel-activo' : 'chip-sel'}
          >
            {opcion.rotulo}
          </Link>
        ))}
        {[20, 30, 50].map((minimo) => (
          <Link
            key={minimo}
            href={enlace({ descuento: descuentoMinimo === minimo ? null : String(minimo) })}
            className={descuentoMinimo === minimo ? 'chip-sel chip-sel-activo' : 'chip-sel'}
          >
            −{minimo}% o más
          </Link>
        ))}
      </div>

      <form action="/radar" className="flex items-center gap-2">
        {(['deporte', 'orden', 'cuando', 'descuento'] as const).map((clave) =>
          actuales[clave] ? <input key={clave} type="hidden" name={clave} value={actuales[clave]} /> : null
        )}
        <input
          name="hasta"
          type="number"
          min={0}
          step={500}
          inputMode="numeric"
          defaultValue={precioMaximo || ''}
          placeholder="Precio máximo"
          className="campo flex-1"
        />
        <button type="submit" className="btn btn-secundario btn-sm">
          Filtrar
        </button>
        {precioMaximo ? (
          <Link href={enlace({ hasta: null })} className="text-xs font-semibold text-tinta-3">
            Quitar
          </Link>
        ) : null}
      </form>

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
            Ahora no hay turnos en el Radar{deporte ? ` de ${deporte.nombre}` : ''}
            {cuando || descuentoMinimo || precioMaximo ? ' con esos filtros' : ''}. Cuando un
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
