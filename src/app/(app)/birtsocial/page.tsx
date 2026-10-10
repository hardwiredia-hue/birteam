import Link from 'next/link';
import { usuarioActual } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { obtenerDestacadas, obtenerFeed } from '@/lib/jugadas';
import { idsBloqueados } from '@/lib/bloqueos';
import { PublicarJugada, TarjetaJugada } from '@/components/jugadas';
import { BotonSeguir } from '@/components/seguir';
import { Avatar } from '@/components/avatar';
import { AccesosRapidos } from '@/components/accesos';

export const metadata = { title: 'BirtSocial' };
export const dynamic = 'force-dynamic';

export default async function BirtSocial({
  searchParams,
}: {
  searchParams: Promise<{ compartir?: string }>;
}) {
  const { compartir } = await searchParams;
  const usuario = (await usuarioActual())!;
  const [{ red, comunidad }, destacadas, avisosSinLeer, mensajesSinLeer] = await Promise.all([
    obtenerFeed(usuario.id),
    obtenerDestacadas(usuario.id),
    prisma.notificacion.count({ where: { usuarioId: usuario.id, leidaEn: null } }),
    prisma.mensaje.count({ where: { destinatarioId: usuario.id, leidoEn: null } }),
  ]);

  // "A quién seguir": lo que toda red necesita para arrancar la bola.
  const [siguiendo, ocultos] = await Promise.all([
    prisma.seguimiento.findMany({ where: { seguidorId: usuario.id }, select: { seguidoId: true } }),
    idsBloqueados(usuario.id),
  ]);
  const sugeridos = await prisma.usuario.findMany({
    where: {
      id: { not: usuario.id, notIn: [...siguiendo.map((s) => s.seguidoId), ...ocultos] },
      eliminadoEn: null,
    },
    include: {
      deportes: { include: { deporte: true }, orderBy: { principal: 'desc' }, take: 1 },
    },
    orderBy: { creadoEn: 'desc' },
    take: 6,
  });

  // ?compartir=torneo:<id> o cancha:<id>: el editor arranca con eso adjunto.
  let torneoId: string | undefined;
  let canchaId: string | undefined;
  let adjunto: string | undefined;
  const [tipoAdjunto, idAdjunto] = (compartir ?? '').split(':');
  if (tipoAdjunto === 'torneo' && idAdjunto) {
    const torneo = await prisma.torneo.findUnique({
      where: { id: idAdjunto },
      include: { deporte: true },
    });
    if (torneo) {
      torneoId = torneo.id;
      adjunto = `Torneo · ${torneo.nombre} (${torneo.deporte.nombre})`;
    }
  } else if (tipoAdjunto === 'cancha' && idAdjunto) {
    const cancha = await prisma.cancha.findUnique({
      where: { id: idAdjunto },
      include: { deporte: true },
    });
    if (cancha) {
      canchaId = cancha.id;
      adjunto = `Cancha · ${cancha.nombre} (${cancha.deporte.nombre})`;
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h1 className="t-pantalla">
          Birt<span className="text-verde-txt">Social</span>
        </h1>
        <div className="flex items-center gap-2">
          <AccesosRapidos avisos={avisosSinLeer} mensajes={mensajesSinLeer} />
          <Link href="/clips" className="btn btn-secundario btn-sm">
            ▶ Clips
          </Link>
        </div>
      </div>

      <PublicarJugada
        caja
        invitacion="Subí una jugada"
        torneoId={torneoId}
        canchaId={canchaId}
        adjunto={adjunto}
      />

      {destacadas.length > 0 ? (
        <section className="flex flex-col gap-3">
          <p className="t-rotulo text-naranja-txt">Lo que está pegando · esta semana</p>
          {destacadas.map((jugada) => (
            <TarjetaJugada key={`destacada-${jugada.id}`} jugada={jugada} />
          ))}
        </section>
      ) : null}

      {sugeridos.length > 0 ? (
        <section className="flex flex-col gap-2">
          <p className="t-rotulo">Jugadores para seguir</p>
          {sugeridos.map((sugerido) => (
            <div key={sugerido.id} className="flex items-center gap-3 border-b border-borde py-2.5 last:border-b-0">
              <Link href={`/jugadores/${sugerido.usuario}`} className="flex min-w-0 flex-1 items-center gap-3">
                <Avatar nombre={sugerido.nombre} avatarUrl={sugerido.avatarUrl} tam={36} />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold">{sugerido.nombre}</span>
                  <span className="block text-xs text-tinta-3">
                    @{sugerido.usuario}
                    {sugerido.deportes[0] ? ` · ${sugerido.deportes[0].deporte.nombre}` : ''}
                    {sugerido.ciudad ? ` · ${sugerido.ciudad}` : ''}
                  </span>
                </span>
              </Link>
              <BotonSeguir usuarioId={sugerido.id} siguiendoInicial={false} />
            </div>
          ))}
        </section>
      ) : null}

      {red.length === 0 && comunidad.length === 0 ? (
        <div className="tarjeta p-5">
          <p className="text-sm text-tinta-2">
            Tu feed arranca acá: subí la primera jugada con la caja de arriba, o seguí a los
            jugadores de la lista y sus publicaciones aparecen solas.
          </p>
        </div>
      ) : (
        <>
          {red.length > 0 ? (
            <section className="flex flex-col gap-3">
              <p className="t-rotulo">De tu red</p>
              {red.map((jugada) => (
                <TarjetaJugada key={jugada.id} jugada={jugada} />
              ))}
            </section>
          ) : null}

          {comunidad.length > 0 ? (
            <section className="flex flex-col gap-3">
              <p className="t-rotulo">De la comunidad</p>
              {comunidad.map((jugada) => (
                <TarjetaJugada key={jugada.id} jugada={jugada} />
              ))}
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}
