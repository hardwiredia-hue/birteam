import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { usuarioActual } from '@/lib/auth';
import { sitioEnConstruccion } from '@/lib/sitio';
import { PaginaConstruccion } from '@/components/construccion';
import { Logotipo } from '@/components/marca';
import { formatearPlata } from '@/lib/formato';
import { formatearPuntaje } from '@/lib/resenas';
import { canchasVisibles, sitioPublico } from '@/lib/publico';
import { diasDeLaCancha, grillaDeTurnos, ofertasVigentes, precioDelTurno } from '@/lib/reservas';

export const dynamic = 'force-dynamic';

const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

async function buscar(id: string) {
  return prisma.cancha.findFirst({
    where: { id, ...canchasVisibles() },
    include: {
      deporte: true,
      dueno: { select: { complejoNombre: true, nombre: true, verificacion: true } },
    },
  });
}

function primeraFoto(crudo: string) {
  try {
    return (JSON.parse(crudo) as string[])[0] ?? null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const cancha = await buscar(id);
  if (!cancha) return { title: 'Cancha', robots: { index: false } };
  const lugar = [cancha.ciudad, cancha.provincia].filter(Boolean).join(', ');
  const titulo = `${cancha.nombre} · ${cancha.deporte.nombre}${lugar ? ` en ${lugar}` : ''}`;
  const descripcion = `${cancha.deporte.nombre} en ${cancha.direccion}${lugar ? `, ${lugar}` : ''}. ${
    cancha.precioPorHora ? `${formatearPlata(cancha.precioPorHora)} la hora. ` : ''
  }Mirá los turnos libres y reservá en birteam.`;
  const foto = primeraFoto(cancha.fotos);
  return {
    title: titulo,
    description: descripcion,
    alternates: { canonical: `${sitioPublico()}/c/${cancha.id}` },
    openGraph: {
      title: titulo,
      description: descripcion,
      url: `${sitioPublico()}/c/${cancha.id}`,
      siteName: 'birteam',
      locale: 'es_AR',
      type: 'website',
      ...(foto ? { images: [{ url: `${sitioPublico()}${foto}` }] } : {}),
    },
  };
}

/**
 * Ficha pública de la cancha (sin cuenta, indexable): lo que hace falta para
 * decidir y un botón para reservar. Los turnos libres salen de la base.
 */
export default async function CanchaPublica({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const usuario = await usuarioActual();
  if ((await sitioEnConstruccion()) && usuario?.rol !== 'ADMIN') return <PaginaConstruccion />;

  const cancha = await buscar(id);
  if (!cancha) notFound();

  const [dias, ofertas, resumen, resenas] = await Promise.all([
    cancha.reservasOnline ? grillaDeTurnos(cancha, usuario?.id ?? '') : Promise.resolve([]),
    ofertasVigentes({ canchaId: cancha.id }),
    prisma.resenaCancha.aggregate({
      where: { canchaId: cancha.id },
      _avg: { puntaje: true },
      _count: { _all: true },
    }),
    prisma.resenaCancha.findMany({
      where: { canchaId: cancha.id, texto: { not: null } },
      include: { usuario: { select: { nombre: true } } },
      orderBy: { creadoEn: 'desc' },
      take: 3,
    }),
  ]);
  const libresHoy = dias[0]?.turnos.filter((t) => t.estado === 'LIBRE').length ?? 0;
  const libresSemana = dias.slice(0, 7).reduce((suma, d) => suma + d.turnos.filter((t) => t.estado === 'LIBRE').length, 0);
  const abiertos = diasDeLaCancha(cancha.diasDisponibles);
  const precioTurno = precioDelTurno(cancha.precioPorHora, cancha.duracionTurno);
  const foto = primeraFoto(cancha.fotos);
  const destino = `/canchas/${cancha.id}`;
  const promedio = resumen._avg.puntaje ?? 0;

  // Datos estructurados para buscadores (schema.org).
  const datosEstructurados = {
    '@context': 'https://schema.org',
    '@type': 'SportsActivityLocation',
    name: cancha.nombre,
    url: `${sitioPublico()}/c/${cancha.id}`,
    ...(foto ? { image: `${sitioPublico()}${foto}` } : {}),
    ...(cancha.telefono ? { telephone: cancha.telefono } : {}),
    address: {
      '@type': 'PostalAddress',
      streetAddress: cancha.direccion,
      ...(cancha.ciudad ? { addressLocality: cancha.ciudad } : {}),
      ...(cancha.provincia ? { addressRegion: cancha.provincia } : {}),
      addressCountry: cancha.pais,
    },
    ...(cancha.latitud != null && cancha.longitud != null
      ? { geo: { '@type': 'GeoCoordinates', latitude: cancha.latitud, longitude: cancha.longitud } }
      : {}),
    ...(resumen._count._all > 0
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: Number(promedio.toFixed(1)),
            reviewCount: resumen._count._all,
          },
        }
      : {}),
  };

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-5 px-5 py-8 lg:max-w-3xl">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(datosEstructurados) }} />
      <div className="flex items-center justify-between">
        <Link href="/">
          <Logotipo ancho={100} />
        </Link>
        <Link href="/c" className="text-xs font-semibold text-tinta-3">
          Todas las canchas
        </Link>
      </div>

      {foto ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img src={foto} alt={cancha.nombre} className="max-h-72 w-full rounded-[12px] border border-borde object-cover" />
      ) : null}

      <header>
        <p className="t-rotulo text-verde-txt">
          {cancha.deporte.nombre}
          {cancha.dueno.verificacion === 'VERIFICADA' ? <span className="ml-2 text-naranja-txt">✓ Verificada</span> : null}
        </p>
        <h1 className="t-display mt-1 text-[28px]">{cancha.nombre}</h1>
        <p className="mt-1 text-sm text-tinta-2">
          {cancha.direccion}
          {cancha.ciudad ? ` · ${cancha.ciudad}` : ''}
          {cancha.provincia ? `, ${cancha.provincia}` : ''}
        </p>
        {resumen._count._all > 0 ? (
          <p className="mt-1 text-sm">
            <span className="text-naranja-txt">★ {formatearPuntaje(promedio)}</span>
            <span className="text-tinta-3">
              {' '}({resumen._count._all} {resumen._count._all === 1 ? 'reseña' : 'reseñas'} de jugadores que fueron)
            </span>
          </p>
        ) : null}
      </header>

      <div className="grid grid-cols-3 gap-2">
        <div className="tarjeta px-2 py-3 text-center">
          <p className="t-display text-[18px] tabular">{precioTurno ? formatearPlata(precioTurno) : 'Consultar'}</p>
          <p className="t-rotulo mt-1 text-[9px]">
            Turno de {cancha.duracionTurno === 60 ? '1 h' : cancha.duracionTurno === 90 ? '1 h 30' : '2 h'}
          </p>
        </div>
        <div className="tarjeta px-2 py-3 text-center">
          <p className="t-display text-[18px] tabular">
            {String(cancha.horaApertura).padStart(2, '0')}–{cancha.horaCierre === 24 ? '24' : String(cancha.horaCierre).padStart(2, '0')}
          </p>
          <p className="t-rotulo mt-1 text-[9px]">Horario</p>
        </div>
        <div className="tarjeta px-2 py-3 text-center">
          <p className="t-display text-[18px] tabular">{cancha.reservasOnline ? libresHoy : '—'}</p>
          <p className="t-rotulo mt-1 text-[9px]">Libres hoy</p>
        </div>
      </div>

      <p className="text-sm text-tinta-2">
        <span className="font-semibold text-tinta">Abre:</span>{' '}
        {[1, 2, 3, 4, 5, 6, 0].filter((d) => abiertos.includes(d)).map((d) => DIAS[d]).join(' · ')}
        {cancha.reservasOnline && libresSemana > 0 ? ` · ${libresSemana} turnos libres esta semana` : ''}
      </p>

      {ofertas.length > 0 ? (
        <div className="tarjeta p-4" style={{ borderColor: 'var(--naranja-txt)' }}>
          <p className="t-rotulo text-naranja-txt">Radar · turnos con descuento</p>
          <p className="mt-1 text-sm">
            {ofertas.length === 1 ? 'Hay 1 turno libre con descuento' : `Hay ${ofertas.length} turnos libres con descuento`}
            {ofertas[0].descuento ? `, hasta −${Math.max(...ofertas.map((o) => o.descuento ?? 0))}%` : ''}.
          </p>
        </div>
      ) : null}

      {cancha.descripcion ? <p className="text-sm leading-relaxed text-tinta-2">{cancha.descripcion}</p> : null}

      {cancha.reservasOnline ? (
        <Link
          href={usuario ? destino : `/entrar?volver=${encodeURIComponent(destino)}`}
          className="btn btn-primario"
        >
          {usuario ? 'Ver turnos y reservar' : 'Entrá para reservar un turno'}
        </Link>
      ) : cancha.telefono ? (
        <a href={`tel:${cancha.telefono.replace(/[^+0-9]/g, '')}`} className="btn btn-primario">
          Llamar para reservar · {cancha.telefono}
        </a>
      ) : null}
      {!usuario ? (
        <p className="text-center text-xs text-tinta-3">
          ¿No tenés cuenta?{' '}
          <Link href={`/registro?volver=${encodeURIComponent(destino)}`} className="font-semibold text-verde-txt">
            Registrate gratis
          </Link>
        </p>
      ) : null}

      {resenas.length > 0 ? (
        <section className="flex flex-col gap-2">
          <p className="t-rotulo">Lo que dicen los que jugaron</p>
          {resenas.map((resena) => (
            <blockquote key={resena.id} className="border-l-2 border-borde-2 pl-3 text-sm text-tinta-2">
              “{resena.texto}” <span className="text-xs text-tinta-3">— {resena.usuario.nombre.split(' ')[0]}</span>
            </blockquote>
          ))}
        </section>
      ) : null}

      <p className="mt-auto pt-6 text-center text-xs text-tinta-3">
        Publicada por {cancha.dueno.complejoNombre ?? cancha.dueno.nombre} en birteam ·{' '}
        <Link href="/registro" className="font-semibold">
          ¿Tenés una cancha? Publicala
        </Link>
      </p>
    </main>
  );
}
