import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { usuarioActual } from '@/lib/auth';
import { suscripcionActiva } from '@/lib/suscripcion';
import { formatearPlata } from '@/lib/formato';
import { Avatar } from '@/components/avatar';
import { GrillaTurnos } from '@/components/turnos';
import { grillaDeTurnos, precioDelTurno } from '@/lib/reservas';
import { duenoCobraOnline } from '@/lib/mercadopago';
import { formatearPuntaje, jugoEnLaCancha } from '@/lib/resenas';
import { Estrellas, FormularioResena, ResponderResena } from '@/components/resenas';

export const dynamic = 'force-dynamic';

export default async function DetalleCancha({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ fecha?: string; hora?: string }>;
}) {
  const { id } = await params;
  const { fecha, hora } = await searchParams;
  const usuario = (await usuarioActual())!;

  const cancha = await prisma.cancha.findUnique({
    where: { id },
    include: {
      deporte: true,
      dueno: {
        select: {
          id: true,
          nombre: true,
          usuario: true,
          avatarUrl: true,
          suscripcionHasta: true,
          verificacion: true,
          complejoNombre: true,
        },
      },
    },
  });
  if (!cancha) notFound();

  const esDueno = cancha.duenoId === usuario.id;
  const visible = cancha.activa && suscripcionActiva(cancha.dueno);
  // Pausada o con suscripción vencida: la ve solo el dueño (y administración).
  if (!visible && !esDueno && usuario.rol !== 'ADMIN') notFound();

  // La grilla: la ve el dueño siempre; los jugadores, si la cancha toma pedidos online.
  const conGrilla = esDueno || (visible && cancha.reservasOnline);
  const dias = conGrilla ? await grillaDeTurnos(cancha, usuario.id) : [];
  const precioTurno = precioDelTurno(cancha.precioPorHora, cancha.duracionTurno);

  const [resenas, resumen, puedeResenar] = await Promise.all([
    prisma.resenaCancha.findMany({
      where: { canchaId: cancha.id },
      include: { usuario: { select: { nombre: true, usuario: true } } },
      orderBy: { creadoEn: 'desc' },
      take: 20,
    }),
    prisma.resenaCancha.aggregate({
      where: { canchaId: cancha.id },
      _avg: { puntaje: true },
      _count: { _all: true },
    }),
    esDueno ? Promise.resolve(false) : jugoEnLaCancha(usuario.id, cancha.id),
  ]);
  const miResena = resenas.find((resena) => resena.usuarioId === usuario.id) ?? null;

  let fotos: string[] = [];
  try {
    fotos = JSON.parse(cancha.fotos);
  } catch {
    fotos = [];
  }

  return (
    <div className="flex flex-col gap-4">
      {!visible ? (
        <p className="aviso-error">
          {cancha.activa
            ? 'Esta publicación no está visible: la suscripción está vencida.'
            : 'Esta publicación está pausada: solo la ves vos.'}
        </p>
      ) : null}

      {fotos.length > 0 ? (
        <div className="flex flex-col gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={fotos[0]}
            alt={cancha.nombre}
            className="max-h-64 w-full rounded-[12px] border border-borde object-cover"
          />
          {fotos.length > 1 ? (
            <div className="flex gap-2 overflow-x-auto">
              {fotos.slice(1).map((foto) => (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  key={foto}
                  src={foto}
                  alt={cancha.nombre}
                  className="h-20 w-20 shrink-0 rounded-[6px] border border-borde object-cover"
                />
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      <header>
        <p className="t-rotulo text-verde-txt">
          {cancha.deporte.nombre} · Cancha
          {cancha.dueno.verificacion === 'VERIFICADA' ? (
            <span className="ml-2 text-naranja-txt">✓ Verificada</span>
          ) : null}
        </p>
        <h1 className="t-display mt-1 text-[26px]">{cancha.nombre}</h1>
        <p className="mt-1 text-sm text-tinta-2">
          {cancha.direccion}
          {cancha.ciudad ? ` · ${cancha.ciudad}` : ''}
          {cancha.provincia ? `, ${cancha.provincia}` : ''}
        </p>
        {resumen._count._all > 0 ? (
          <a href="#resenas" className="mt-1 flex items-center gap-2 text-sm">
            <Estrellas puntaje={resumen._avg.puntaje ?? 0} />
            <span className="font-semibold tabular">{formatearPuntaje(resumen._avg.puntaje ?? 0)}</span>
            <span className="text-tinta-3">
              ({resumen._count._all} {resumen._count._all === 1 ? 'reseña' : 'reseñas'})
            </span>
          </a>
        ) : null}
      </header>

      <div className="grid grid-cols-2 gap-2">
        <div className="tarjeta px-3 py-3 text-center">
          <p className="t-display text-[20px] text-verde-txt tabular">
            {cancha.precioPorHora ? formatearPlata(cancha.precioPorHora) : 'Consultar'}
          </p>
          <p className="t-rotulo mt-1 text-[9.5px]">Por hora</p>
        </div>
        <div className="tarjeta px-3 py-3 text-center">
          <p className="t-display text-[20px] tabular">{cancha.deporte.nombre}</p>
          <p className="t-rotulo mt-1 text-[9.5px]">Deporte</p>
        </div>
      </div>

      <DiasDeLaCancha crudo={cancha.diasDisponibles} />

      {cancha.descripcion ? (
        <p className="text-sm leading-relaxed text-tinta-2">{cancha.descripcion}</p>
      ) : null}

      <section className="tarjeta flex items-center gap-3 p-4">
        <Avatar nombre={cancha.dueno.nombre} avatarUrl={cancha.dueno.avatarUrl} tam={40} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">
            {cancha.dueno.complejoNombre ?? cancha.dueno.nombre}
          </p>
          <p className="t-rotulo mt-0.5">
            Publica esta cancha
            {cancha.dueno.verificacion === 'VERIFICADA' ? ' · titularidad verificada' : ''}
          </p>
        </div>
        {!esDueno ? (
          <Link href={`/mensajes/${cancha.dueno.usuario}`} className="btn btn-secundario btn-sm">
            Mensaje
          </Link>
        ) : null}
      </section>

      {conGrilla ? (
        <GrillaTurnos
          canchaId={cancha.id}
          dias={dias}
          esDueno={esDueno}
          precioTurno={precioTurno != null ? formatearPlata(precioTurno) : null}
          precioBase={precioTurno}
          inicial={fecha && hora ? { fecha, hora } : null}
          cobro={
            cancha.cobroOnline !== 'NO' && precioTurno != null && (await duenoCobraOnline(cancha.duenoId))
              ? { tipo: cancha.cobroOnline as 'SENA' | 'TOTAL', porcentaje: cancha.senaPorcentaje }
              : null
          }
          duracion={cancha.duracionTurno}
          telefono={cancha.telefono}
        />
      ) : null}

      {esDueno && !cancha.reservasOnline ? (
        <p className="text-xs text-tinta-3">
          Los jugadores no ven esta grilla: tenés apagados los pedidos online. Prendelos desde
          “Editar la cancha”.
        </p>
      ) : null}

      {!esDueno && !conGrilla && cancha.telefono ? (
        <a href={`tel:${cancha.telefono.replace(/[^+0-9]/g, '')}`} className="btn btn-primario">
          Llamar para reservar · {cancha.telefono}
        </a>
      ) : null}

      <section id="resenas" className="flex flex-col gap-3">
        <p className="t-rotulo">
          Reseñas
          {resumen._count._all > 0
            ? ` · ${formatearPuntaje(resumen._avg.puntaje ?? 0)} de 5 (${resumen._count._all})`
            : ''}
        </p>
        {puedeResenar ? (
          <FormularioResena
            canchaId={cancha.id}
            inicial={miResena ? { id: miResena.id, puntaje: miResena.puntaje, texto: miResena.texto } : null}
          />
        ) : !esDueno ? (
          <p className="text-xs text-tinta-3">
            Reseñan los que jugaron acá (con un turno confirmado o un partido en esta cancha):
            así las opiniones son reales.
          </p>
        ) : null}
        {resenas.length === 0 ? (
          <p className="text-sm text-tinta-2">Todavía no tiene reseñas.</p>
        ) : (
          resenas.map((resena) => (
            <article key={resena.id} className="flex flex-col gap-1.5 border-b border-borde pb-3 last:border-b-0">
              <div className="flex items-baseline justify-between gap-3">
                <Link href={`/jugadores/${resena.usuario.usuario}`} className="truncate text-sm font-semibold">
                  {resena.usuario.nombre}
                </Link>
                <span className="shrink-0 text-xs text-tinta-3">
                  {resena.creadoEn.toLocaleDateString('es-AR', {
                    day: 'numeric',
                    month: 'short',
                    timeZone: 'America/Argentina/Buenos_Aires',
                  })}
                </span>
              </div>
              <Estrellas puntaje={resena.puntaje} tam={13} />
              {resena.texto ? <p className="text-sm text-tinta-2">{resena.texto}</p> : null}
              {resena.respuesta ? (
                <div className="ml-3 border-l-2 border-borde-2 pl-3">
                  <p className="t-rotulo">Respuesta del complejo</p>
                  <p className="text-sm text-tinta-2">{resena.respuesta}</p>
                </div>
              ) : null}
              {esDueno ? <ResponderResena resenaId={resena.id} respuesta={resena.respuesta} /> : null}
            </article>
          ))
        )}
      </section>

      <Link href={`/birtsocial?compartir=cancha:${cancha.id}`} className="btn btn-fantasma">
        Compartir en BirtSocial
      </Link>

      {esDueno ? (
        <>
          <Link href={`/canchas/${cancha.id}/editar`} className="btn btn-secundario">
            Editar la cancha
          </Link>
          {visible ? (
            <p className="text-center text-xs text-tinta-3">
              Ficha pública para compartir y para Google:{' '}
              <Link href={`/c/${cancha.id}`} className="font-semibold text-verde-txt">
                birteam.com/c/{cancha.id}
              </Link>
            </p>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

const ROTULOS_DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

/** Días en que la cancha está disponible; si abre todos, no hace falta decir nada. */
function DiasDeLaCancha({ crudo }: { crudo: string }) {
  let dias: number[] = [];
  try {
    dias = JSON.parse(crudo);
  } catch {
    return null;
  }
  if (dias.length >= 7 || dias.length === 0) return null;
  // De lunes a domingo, como se lee un calendario.
  const orden = [1, 2, 3, 4, 5, 6, 0];
  return (
    <p className="text-sm text-tinta-2">
      <span className="font-semibold text-tinta">Días disponibles:</span>{' '}
      {orden.filter((dia) => dias.includes(dia)).map((dia) => ROTULOS_DIAS[dia]).join(' · ')}
    </p>
  );
}
