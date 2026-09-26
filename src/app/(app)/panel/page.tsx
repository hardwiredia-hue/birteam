import Image from 'next/image';
import Link from 'next/link';
import { prisma } from '@/lib/db';
import { usuarioActual } from '@/lib/auth';
import { Avisos } from './avisos';
import iso from '../../../../public/birteam-iso.png';

export const metadata = { title: 'Inicio' };
export const dynamic = 'force-dynamic';

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

export default async function Inicio() {
  const usuario = (await usuarioActual())!;
  const hoy = new Date();

  // Tu próximo partido: el más cercano en el que estás anotado u organizás.
  const proxima = await prisma.participacion.findFirst({
    where: {
      usuarioId: usuario.id,
      estado: { in: ['VOY', 'TALVEZ', 'ESPERA'] },
      partido: { fecha: { gte: hoy }, estado: { in: ['ARMANDOSE', 'CONFIRMADO'] } },
    },
    orderBy: { partido: { fecha: 'asc' } },
    include: { partido: { include: { deporte: true } } },
  });

  const membresias = await prisma.miembroGrupo.findMany({
    where: { usuarioId: usuario.id },
    include: { grupo: { include: { deporte: true, _count: { select: { miembros: true } } } } },
    orderBy: { unidoEn: 'asc' },
    take: 3,
  });

  const avisos = await prisma.notificacion.findMany({
    where: { usuarioId: usuario.id, leidaEn: null },
    orderBy: { creadoEn: 'desc' },
    take: 5,
    select: { id: true, tipo: true, titulo: true, cuerpo: true, url: true },
  });

  const mensajesSinLeer = await prisma.mensaje.count({
    where: { destinatarioId: usuario.id, leidoEn: null },
  });

  const primerNombre = usuario.nombre.split(' ')[0];
  const deportePrincipal =
    usuario.deportes.find((relacion) => relacion.principal)?.deporte ??
    usuario.deportes[0]?.deporte ??
    null;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Image src={iso} alt="" width={22} />
          <div>
            <p className="text-sm text-tinta-2">Hola, {primerNombre}</p>
            <p className="t-pantalla">
              {DIAS[hoy.getDay()]} {hoy.getDate()} {MESES[hoy.getMonth()]}
            </p>
          </div>
        </div>
        <Link
          href="/mensajes"
          aria-label="Mensajes"
          className="relative flex h-9 w-9 items-center justify-center rounded-[6px] border border-borde-2 text-tinta-2"
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12a8 8 0 0 1-8 8H4l1.5-3.2A8 8 0 1 1 21 12z" />
          </svg>
          {mensajesSinLeer > 0 ? (
            <span
              className="absolute -right-1 -top-1 h-4 min-w-4 rounded-full px-1 text-center text-[10px] font-bold leading-4 tabular"
              style={{ background: 'var(--verde)', color: 'var(--sobre-verde)' }}
            >
              {mensajesSinLeer}
            </span>
          ) : null}
        </Link>
      </header>

      <Avisos avisos={avisos} />

      <section>
        <p className="t-rotulo mb-2">Tu próximo partido</p>
        {proxima ? (
          <Link href={`/partidos/${proxima.partidoId}`} className="tarjeta flex flex-col gap-3 p-5">
            <p className="t-rotulo text-verde-txt">
              {proxima.partido.deporte.nombre}
              {proxima.partido.recurrenteSemanal ? ' · se repite' : ''}
            </p>
            <div>
              <p className="t-display text-[26px]">
                {DIAS[proxima.partido.fecha.getDay()]}{' '}
                {proxima.partido.fecha.toLocaleTimeString('es-AR', {
                  hour12: false, hour: '2-digit',
                  minute: '2-digit',
                  timeZone: 'America/Argentina/Buenos_Aires',
                })}
              </p>
              <p className="mt-1 text-sm text-tinta-2">{proxima.partido.lugarNombre}</p>
            </div>
          </Link>
        ) : (
          <div className="tarjeta flex flex-col gap-4 p-5">
            <p className="text-sm text-tinta-2">
              Todavía no tenés partidos armados. Por acá se empieza:
            </p>
            <Link href="/crear" className="btn btn-primario">
              Creá tu primer partido
            </Link>
            <Link href="/explorar" className="btn btn-secundario">
              Buscar partidos cerca
            </Link>
          </div>
        )}
      </section>

      <Link
        href={deportePrincipal ? `/comunidades/${deportePrincipal.slug}` : '/comunidades'}
        className="tarjeta flex items-center justify-between gap-3 p-4"
      >
        <div>
          <p className="t-rotulo text-verde-txt">Tu comunidad</p>
          <p className="mt-0.5 text-sm font-semibold">
            {deportePrincipal ? deportePrincipal.nombre : 'Elegí tu deporte'} — partidos abiertos,
            grupos y ranking
          </p>
        </div>
        <span className="t-display text-[16px] text-verde-txt">→</span>
      </Link>

      <Link href="/torneos" className="tarjeta flex items-center justify-between gap-3 p-4">
        <div>
          <p className="t-rotulo text-naranja-txt">Torneos</p>
          <p className="mt-0.5 text-sm font-semibold">
            Armá una liga o anotá tu equipo — la tabla se lleva sola
          </p>
        </div>
        <span className="t-display text-[16px] text-naranja-txt">→</span>
      </Link>

      <section>
        <div className="mb-2 flex items-baseline justify-between">
          <p className="t-rotulo">Tus grupos</p>
          <Link href="/grupos" className="text-xs font-semibold text-verde-txt">
            {membresias.length > 0 ? 'Ver todos' : 'Crear uno'}
          </Link>
        </div>
        {membresias.length === 0 ? (
          <Link href="/grupos/nuevo" className="tarjeta block p-4">
            <p className="text-sm text-tinta-2">
              Tu gente en un solo lugar: armás el grupo una vez y cada partido sale con un toque.
            </p>
          </Link>
        ) : (
          <div className="flex flex-col gap-2">
            {membresias.map(({ grupo }) => (
              <Link key={grupo.id} href={`/grupos/${grupo.id}`} className="tarjeta flex items-center justify-between gap-3 p-3.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{grupo.nombre}</p>
                  <p className="t-rotulo mt-0.5">
                    {grupo.deporte.nombre} · {grupo._count.miembros}{' '}
                    {grupo._count.miembros === 1 ? 'miembro' : 'miembros'}
                  </p>
                </div>
                <span className="t-display text-[16px] text-verde-txt">→</span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
