import Link from 'next/link';
import { diaDeLaSemana } from '@/lib/formato';
import { notFound, redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { usuarioActual } from '@/lib/auth';
import { Chat } from '@/components/chat';
import { PublicarJugada, TarjetaJugada } from '@/components/jugadas';
import { obtenerJugadas } from '@/lib/jugadas';
import { AccionesMiembro, CopiarInvitacion, EditarGrupo } from './acciones';
import { Avatar } from '@/components/avatar';
import { LogoEquipo } from '@/components/logo-equipo';
import { SubirLogo } from '@/components/subir-logo';
import { EncuestaGrupo } from './encuesta';
import { encuestaAbierta, puedeCerrar, rotuloOpcion } from '@/lib/encuestas';

export const metadata = { title: 'Grupo' };
export const dynamic = 'force-dynamic';

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

export default async function PaginaGrupo({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const usuario = (await usuarioActual())!;

  const grupo = await prisma.grupo.findUnique({
    where: { id },
    include: {
      deporte: true,
      miembros: {
        include: {
          usuario: { select: { id: true, nombre: true, usuario: true, ciudad: true, avatarUrl: true } },
        },
        orderBy: { unidoEn: 'asc' },
      },
      partidos: {
        where: { estado: { in: ['ARMANDOSE', 'CONFIRMADO'] }, fecha: { gte: new Date() } },
        include: { participaciones: { where: { estado: 'VOY' }, select: { id: true } } },
        orderBy: { fecha: 'asc' },
        take: 5,
      },
    },
  });
  if (!grupo) notFound();

  const membresia = grupo.miembros.find((miembro) => miembro.usuarioId === usuario.id);
  // Los grupos son de sus miembros; el link de invitación es la puerta.
  if (!membresia) redirect(`/g/${grupo.tokenInvitacion}`);
  const soyAdmin = membresia.rol === 'ADMIN';
  const encuesta = await encuestaAbierta(grupo.id);
  const ZONA = 'America/Argentina/Buenos_Aires';

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1.5">
        <div className="flex items-center gap-3">
          <LogoEquipo nombre={grupo.nombre} url={grupo.fotoUrl} tam={56} />
          <div className="min-w-0">
            <p className="t-rotulo text-verde-txt">{grupo.deporte.nombre}</p>
            <h1 className="t-display text-[26px]">{grupo.nombre}</h1>
          </div>
        </div>
        {grupo.descripcion ? <p className="text-sm text-tinta-2">{grupo.descripcion}</p> : null}
        <p className="text-xs text-tinta-3">
          {grupo.miembros.length} {grupo.miembros.length === 1 ? 'miembro' : 'miembros'}
          {grupo.ciudad ? ` · ${grupo.ciudad}` : ''}
        </p>
      </header>

      <div className="grid grid-cols-2 gap-2">
        <Link href={`/crear?grupo=${grupo.id}`} className="btn btn-primario">Armar partido</Link>
        <CopiarInvitacion ruta={`/g/${grupo.tokenInvitacion}`} />
      </div>

      <EncuestaGrupo
        grupoId={grupo.id}
        miId={usuario.id}
        puedeCerrar={encuesta ? await puedeCerrar(usuario.id, encuesta) : false}
        encuesta={
          encuesta
            ? {
                id: encuesta.id,
                creador: encuesta.creador.id === usuario.id ? 'vos' : encuesta.creador.nombre.split(' ')[0],
                // Los horarios que ya pasaron no se votan ni se arman.
                opciones: encuesta.opciones.filter((opcion) => opcion.fecha > new Date()).map((opcion) => ({
                  id: opcion.id,
                  rotulo: rotuloOpcion(opcion.fecha),
                  dia: opcion.fecha.toLocaleDateString('en-CA', { timeZone: ZONA }),
                  hora: opcion.fecha.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: ZONA }),
                  votos: opcion.votos.map((voto) => ({ id: voto.usuario.id, nombre: voto.usuario.nombre })),
                })),
              }
            : null
        }
      />
      {soyAdmin ? (
        <Link href={`/desafios/nuevo?grupo=${grupo.id}`} className="btn btn-secundario">
          Desafiar a otro grupo
        </Link>
      ) : null}

      {soyAdmin ? (
        <section className="tarjeta flex flex-col gap-3 p-4">
          <div>
            <p className="text-sm font-semibold">Logo del grupo</p>
            <p className="text-xs text-tinta-3">Se ve en el grupo, en los desafíos y en Explorar. Cuadrado queda mejor.</p>
          </div>
          <SubirLogo endpoint={`/api/grupos/${grupo.id}/logo`} nombre={grupo.nombre} url={grupo.fotoUrl} />
        </section>
      ) : null}

      {soyAdmin ? (
        <EditarGrupo
          grupoId={grupo.id}
          inicial={{ nombre: grupo.nombre, descripcion: grupo.descripcion, abierto: grupo.abierto }}
        />
      ) : null}

      <section>
        <p className="t-rotulo mb-2">Próximos partidos</p>
        {grupo.partidos.length === 0 ? (
          <p className="tarjeta p-4 text-sm text-tinta-2">
            Nada agendado. "Armar partido" y en un minuto está girando la convocatoria.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {grupo.partidos.map((partido) => {
              const hora = partido.fecha.toLocaleTimeString('es-AR', {
                hour12: false, hour: '2-digit',
                minute: '2-digit',
                timeZone: 'America/Argentina/Buenos_Aires',
              });
              return (
                <Link key={partido.id} href={`/partidos/${partido.id}`} className="tarjeta flex items-center justify-between gap-3 p-4">
                  <div>
                    <p className="t-display text-[17px]">
                      {DIAS[diaDeLaSemana(partido.fecha)]} {hora}
                    </p>
                    <p className="mt-0.5 text-xs text-tinta-3">{partido.lugarNombre}</p>
                  </div>
                  <span className="t-rotulo tabular">
                    {partido.participaciones.length}/{partido.cupo}
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <section id="charla" className="scroll-mt-20">
        <p className="t-rotulo mb-2">Charla del grupo</p>
        <Chat grupoId={grupo.id} />
      </section>

      <section className="flex flex-col gap-3">
        <p className="t-rotulo">Jugadas del grupo</p>
        <PublicarJugada grupoId={grupo.id} invitacion="Subí una jugada del grupo" />
        {(await obtenerJugadas(usuario.id, { grupoId: grupo.id })).map((jugada) => (
          <TarjetaJugada key={jugada.id} jugada={jugada} />
        ))}
      </section>

      <section>
        <p className="t-rotulo mb-2">Miembros · {grupo.miembros.length}</p>
        <div>
          {grupo.miembros.map((miembro) => (
            <div key={miembro.usuarioId} className="flex items-center gap-3 border-b border-borde py-2.5 last:border-b-0">
              <Avatar nombre={miembro.usuario.nombre} avatarUrl={miembro.usuario.avatarUrl} tam={32} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{miembro.usuario.nombre}</p>
                <p className="text-xs text-tinta-3">
                  @{miembro.usuario.usuario}
                  {miembro.usuario.ciudad ? ` · ${miembro.usuario.ciudad}` : ''}
                </p>
              </div>
              {miembro.rol === 'ADMIN' ? <span className="t-rotulo">admin</span> : null}
              {soyAdmin &&
              miembro.usuarioId !== usuario.id &&
              miembro.usuarioId !== grupo.creadorId ? (
                <AccionesMiembro
                  grupoId={grupo.id}
                  usuarioId={miembro.usuarioId}
                  nombre={miembro.usuario.nombre}
                  esAdmin={miembro.rol === 'ADMIN'}
                />
              ) : null}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
