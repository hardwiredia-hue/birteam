import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { usuarioActual } from '@/lib/auth';
import { sitioEnConstruccion } from '@/lib/sitio';
import { Logotipo } from '@/components/marca';
import { Avatar } from '@/components/avatar';
import { PaginaConstruccion } from '@/components/construccion';
import { analizarVideoExterno } from '@/lib/video-externo';

export const metadata = { title: 'Jugada' };
export const dynamic = 'force-dynamic';

/** Link público de una jugada (solo las públicas: las de grupo son del grupo). */
export default async function JugadaPublica({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const usuarioDeGuardia = await usuarioActual();
  if ((await sitioEnConstruccion()) && usuarioDeGuardia?.rol !== 'ADMIN') {
    return <PaginaConstruccion />;
  }

  const jugada = await prisma.jugada.findUnique({
    where: { id },
    include: {
      autor: { select: { nombre: true, usuario: true, avatarUrl: true } },
      _count: { select: { comentarios: true, meGusta: true } },
    },
  });
  if (!jugada || jugada.grupoId !== null) notFound();

  let fotos: string[] = [];
  try {
    fotos = JSON.parse(jugada.fotos);
  } catch {
    fotos = [];
  }

  const videoExterno = jugada.videoExternoUrl ? analizarVideoExterno(jugada.videoExternoUrl) : null;

  const [torneo, cancha, partido] = await Promise.all([
    jugada.torneoId
      ? prisma.torneo.findUnique({ where: { id: jugada.torneoId }, include: { deporte: true } })
      : null,
    jugada.canchaId
      ? prisma.cancha.findUnique({ where: { id: jugada.canchaId }, include: { deporte: true } })
      : null,
    jugada.partidoId
      ? prisma.partido.findUnique({ where: { id: jugada.partidoId }, include: { deporte: true } })
      : null,
  ]);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 py-10">
      <Link href="/">
        <Logotipo ancho={110} />
      </Link>

      <div className="flex flex-1 flex-col justify-center py-8">
        <article className="tarjeta flex flex-col gap-3 p-4">
          <header className="flex items-center gap-2.5">
            <Avatar nombre={jugada.autor.nombre} avatarUrl={jugada.autor.avatarUrl} tam={32} />
            <div>
              <p className="text-sm font-semibold">{jugada.autor.nombre}</p>
              <p className="t-rotulo">@{jugada.autor.usuario} · en birteam</p>
            </div>
          </header>

          {jugada.texto ? <p className="text-sm">{jugada.texto}</p> : null}

          {jugada.videoUrl ? (
            <video
              src={jugada.videoUrl}
              className="w-full rounded-[6px] border border-borde bg-black"
              style={{ maxHeight: 420 }}
              controls
              playsInline
              preload="metadata"
            />
          ) : null}

          {videoExterno ? (
            videoExterno.embed ? (
              <iframe
                src={videoExterno.embed}
                className="aspect-video w-full rounded-[6px] border border-borde bg-black"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                title={`Video de ${videoExterno.proveedor}`}
              />
            ) : (
              <a
                href={videoExterno.url}
                target="_blank"
                rel="noreferrer"
                className="tarjeta block p-3"
              >
                <span className="t-rotulo text-azul-txt">Video · {videoExterno.proveedor}</span>
                <span className="mt-0.5 block text-sm font-semibold">
                  Ver en {videoExterno.proveedor} →
                </span>
              </a>
            )
          ) : null}

          {fotos.length > 0 ? (
            <div className={fotos.length === 1 ? '' : 'grid grid-cols-2 gap-1.5'}>
              {fotos.map((foto) => (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  key={foto}
                  src={`/api/archivos/${foto}`}
                  alt=""
                  className="w-full rounded-[6px] border border-borde object-cover"
                  style={{ maxHeight: fotos.length === 1 ? 420 : 180 }}
                />
              ))}
            </div>
          ) : null}

          {torneo ? (
            <p className="t-rotulo text-naranja-txt">Torneo · {torneo.deporte.nombre} · {torneo.nombre}</p>
          ) : null}
          {cancha ? (
            <p className="t-rotulo text-naranja-txt">Cancha · {cancha.deporte.nombre} · {cancha.nombre}</p>
          ) : null}
          {partido ? (
            <p className="t-rotulo text-verde-txt">{partido.deporte.nombre} · {partido.lugarNombre}</p>
          ) : null}

          <footer className="t-rotulo tabular">
            {jugada._count.meGusta > 0 ? `▲ ${jugada._count.meGusta} · ` : ''}
            {jugada._count.comentarios > 0 ? `${jugada._count.comentarios} comentarios · ` : ''}
            {jugada.creadoEn.toLocaleDateString('es-AR', {
              day: 'numeric',
              month: 'short',
              timeZone: 'America/Argentina/Buenos_Aires',
            })}
          </footer>
        </article>

        <div className="mt-6 flex flex-col gap-3">
          <p className="text-center text-sm text-tinta-2">
            birteam es donde se organiza el juego: partidos, torneos, canchas y tu gente.
          </p>
          {usuarioDeGuardia ? (
            <Link href="/birtsocial" className="btn btn-primario">Ver BirtSocial</Link>
          ) : (
            <>
              <Link href="/registro" className="btn btn-primario">Sumate a birteam</Link>
              <Link href="/entrar" className="btn btn-fantasma">Ya tengo cuenta</Link>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
