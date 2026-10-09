import Link from 'next/link';
import { prisma } from '@/lib/db';
import { usuarioActual } from '@/lib/auth';
import { ROTULOS_NIVEL } from '@/lib/constantes';
import { ESTADOS_DESAFIO, gruposQueAdministro, rotuloFecha } from '@/lib/desafios';
import { AccionesDesafio } from './acciones';

export const metadata = { title: 'Desafíos' };
export const dynamic = 'force-dynamic';

const incluir = {
  deporte: { select: { nombre: true } },
  retador: { select: { id: true, nombre: true, ciudad: true, _count: { select: { miembros: true } } } },
  rival: { select: { id: true, nombre: true } },
} as const;

/**
 * Buscador de rivales: desafíos abiertos de otros grupos, los que te
 * mandaron, los que mandaste y los partidos que salieron de ahí.
 */
export default async function Desafios({
  searchParams,
}: {
  searchParams: Promise<{ deporte?: string }>;
}) {
  const { deporte: slug } = await searchParams;
  const usuario = (await usuarioActual())!;
  const ahora = new Date();

  const [administrados, membresias, deportes] = await Promise.all([
    gruposQueAdministro(usuario.id),
    prisma.miembroGrupo.findMany({ where: { usuarioId: usuario.id }, select: { grupoId: true } }),
    prisma.deporte.findMany({ orderBy: { orden: 'asc' }, select: { id: true, nombre: true, slug: true } }),
  ]);
  const misGrupos = membresias.map((m) => m.grupoId);
  const idsAdmin = administrados.map((g) => g.id);
  const deporte = deportes.find((d) => d.slug === slug) ?? null;

  const [recibidos, abiertos, mios] = await Promise.all([
    prisma.desafio.findMany({
      where: { rivalId: { in: idsAdmin }, estado: 'PENDIENTE', fecha: { gt: ahora } },
      include: incluir,
      orderBy: { fecha: 'asc' },
    }),
    prisma.desafio.findMany({
      where: {
        rivalId: null,
        estado: 'PENDIENTE',
        fecha: { gt: ahora },
        retadorId: { notIn: misGrupos },
        ...(deporte ? { deporteId: deporte.id } : {}),
      },
      include: incluir,
      orderBy: { fecha: 'asc' },
      take: 40,
    }),
    prisma.desafio.findMany({
      where: {
        OR: [{ retadorId: { in: misGrupos } }, { rivalId: { in: misGrupos }, estado: { not: 'PENDIENTE' } }],
        fecha: { gt: new Date(ahora.getTime() - 7 * 24 * 3600_000) },
      },
      include: incluir,
      orderBy: { fecha: 'asc' },
      take: 30,
    }),
  ]);

  // Lo compatible primero: mismo deporte que un grupo tuyo y misma ciudad.
  const ciudades = new Set(administrados.map((g) => g.ciudad).filter(Boolean));
  const deportesMios = new Set(administrados.map((g) => g.deporteId));
  const puntaje = (d: (typeof abiertos)[number]) =>
    (deportesMios.has(d.deporteId) ? 2 : 0) + (d.ciudad && ciudades.has(d.ciudad) ? 1 : 0);
  const abiertosOrdenados = [...abiertos].sort((a, b) => puntaje(b) - puntaje(a));

  const conQuienAcepto = (deporteId: string) =>
    administrados.filter((g) => g.deporteId === deporteId).map((g) => ({ id: g.id, nombre: g.nombre }));

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="t-rotulo text-naranja-txt">Buscador de rivales</p>
          <h1 className="t-pantalla mt-1">Desafíos</h1>
          <p className="mt-1 text-sm text-tinta-2">
            Tu grupo contra otro: proponés día y lugar, el rival acepta y el partido se arma solo
            con los dos grupos invitados.
          </p>
        </div>
      </header>

      {administrados.length > 0 ? (
        <Link href="/desafios/nuevo" className="btn btn-primario">
          + Nuevo desafío
        </Link>
      ) : (
        <div className="tarjeta flex flex-col gap-3 p-4">
          <p className="text-sm text-tinta-2">
            Para desafiar necesitás ser admin de un grupo. Armá el tuyo con tu equipo de siempre.
          </p>
          <Link href="/grupos/nuevo" className="btn btn-secundario btn-sm self-start">
            Crear un grupo
          </Link>
        </div>
      )}

      {recibidos.length > 0 ? (
        <section className="flex flex-col gap-2">
          <p className="t-rotulo text-naranja-txt">Te desafiaron · {recibidos.length}</p>
          {recibidos.map((desafio) => (
            <TarjetaDesafio key={desafio.id} desafio={desafio}>
              <AccionesDesafio
                desafioId={desafio.id}
                dirigido
                puedoCancelar={false}
                gruposParaAceptar={desafio.rival ? [desafio.rival] : []}
              />
            </TarjetaDesafio>
          ))}
        </section>
      ) : null}

      <section className="flex flex-col gap-2">
        <p className="t-rotulo">Grupos que buscan rival</p>
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          <Link href="/desafios" className={!deporte ? 'chip-sel chip-sel-activo shrink-0' : 'chip-sel shrink-0'}>
            Todos
          </Link>
          {deportes.map((d) => (
            <Link
              key={d.id}
              href={`/desafios?deporte=${d.slug}`}
              className={deporte?.id === d.id ? 'chip-sel chip-sel-activo shrink-0' : 'chip-sel shrink-0'}
            >
              {d.nombre}
            </Link>
          ))}
        </div>
        {abiertosOrdenados.length === 0 ? (
          <p className="tarjeta p-4 text-sm text-tinta-2">
            Ahora no hay desafíos abiertos{deporte ? ` de ${deporte.nombre}` : ''}. Publicá el tuyo
            y que lo acepte el primero que se anime.
          </p>
        ) : (
          abiertosOrdenados.map((desafio) => (
            <TarjetaDesafio key={desafio.id} desafio={desafio} compatible={puntaje(desafio) >= 2}>
              <AccionesDesafio
                desafioId={desafio.id}
                dirigido={false}
                puedoCancelar={false}
                gruposParaAceptar={conQuienAcepto(desafio.deporteId)}
              />
            </TarjetaDesafio>
          ))
        )}
      </section>

      {mios.length > 0 ? (
        <section className="flex flex-col gap-2">
          <p className="t-rotulo">De tus grupos</p>
          {mios.map((desafio) => (
            <TarjetaDesafio key={desafio.id} desafio={desafio} conEstado>
              {desafio.estado === 'ACEPTADO' && desafio.partidoId ? (
                <Link href={`/partidos/${desafio.partidoId}`} className="btn btn-secundario btn-sm self-start">
                  Ver el partido
                </Link>
              ) : desafio.estado === 'PENDIENTE' && idsAdmin.includes(desafio.retadorId) ? (
                <AccionesDesafio
                  desafioId={desafio.id}
                  dirigido={Boolean(desafio.rivalId)}
                  puedoCancelar
                  gruposParaAceptar={[]}
                />
              ) : null}
            </TarjetaDesafio>
          ))}
        </section>
      ) : null}
    </div>
  );
}

function TarjetaDesafio({
  desafio,
  children,
  compatible,
  conEstado,
}: {
  desafio: {
    estado: string;
    fecha: Date;
    lugarNombre: string;
    ciudad: string | null;
    jugadoresPorLado: number;
    nivel: string | null;
    mensaje: string | null;
    deporte: { nombre: string };
    retador: { nombre: string; _count: { miembros: number } };
    rival: { nombre: string } | null;
  };
  children?: React.ReactNode;
  compatible?: boolean;
  conEstado?: boolean;
}) {
  return (
    <article className="tarjeta flex flex-col gap-3 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="t-rotulo text-verde-txt">
            {desafio.deporte.nombre} · {desafio.jugadoresPorLado} vs {desafio.jugadoresPorLado}
            {desafio.nivel ? ` · ${ROTULOS_NIVEL[desafio.nivel]}` : ''}
          </p>
          <p className="t-display mt-1 text-[18px]">
            {desafio.retador.nombre}
            <span className="text-tinta-3"> vs </span>
            {desafio.rival ? desafio.rival.nombre : '¿quién se anima?'}
          </p>
        </div>
        {compatible ? (
          <span className="t-rotulo shrink-0 text-naranja-txt">Para vos</span>
        ) : conEstado ? (
          <span className="t-rotulo shrink-0">{ESTADOS_DESAFIO[desafio.estado]}</span>
        ) : null}
      </div>
      <p className="text-sm text-tinta-2">
        {rotuloFecha(desafio.fecha)} · {desafio.lugarNombre}
        {desafio.ciudad ? ` · ${desafio.ciudad}` : ''}
      </p>
      {desafio.mensaje ? <p className="text-sm italic text-tinta-2">“{desafio.mensaje}”</p> : null}
      {children}
    </article>
  );
}
