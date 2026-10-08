import { prisma } from '@/lib/db';
import { usuarioActual } from '@/lib/auth';
import { AccionesPerfil, SubirComprobante } from './acciones';
import { ESTADOS_VERIFICACION } from '@/lib/verificacion';
import { ListaBloqueados } from './bloqueados';
import { PublicarJugada, TarjetaJugada } from '@/components/jugadas';
import { obtenerJugadas } from '@/lib/jugadas';
import { estadisticasJugador } from '@/lib/estadisticas';
import { suscripcionActiva } from '@/lib/suscripcion';
import { Avatar } from '@/components/avatar';

export const metadata = { title: 'Perfil' };
export const dynamic = 'force-dynamic';

export default async function Perfil() {
  const usuario = (await usuarioActual())!;

  const [conRegistro, grupos, historial, bloqueos, seguidores, siguiendo] = await Promise.all([
    // Participaciones con lista pasada: la base del % de asistencia.
    prisma.participacion.findMany({
      where: { usuarioId: usuario.id, asistio: { not: null } },
      select: { asistio: true },
    }),
    prisma.miembroGrupo.count({ where: { usuarioId: usuario.id } }),
    prisma.participacion.findMany({
      where: { usuarioId: usuario.id, partido: { estado: 'JUGADO' } },
      include: { partido: { include: { deporte: true } } },
      orderBy: { partido: { fecha: 'desc' } },
      take: 6,
    }),
    prisma.bloqueo.findMany({
      where: { bloqueadorId: usuario.id },
      include: { bloqueado: { select: { id: true, nombre: true, usuario: true } } },
    }),
    prisma.seguimiento.count({ where: { seguidoId: usuario.id } }),
    prisma.seguimiento.count({ where: { seguidorId: usuario.id } }),
  ]);
  const estadisticas = await estadisticasJugador(usuario.id);

  const jugados = conRegistro.filter((p) => p.asistio).length;
  const asistencia =
    conRegistro.length > 0 ? Math.round((jugados / conRegistro.length) * 100) : null;

  const iniciales = usuario.nombre
    .split(' ')
    .map((parte) => parte[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center gap-4">
        <Avatar nombre={usuario.nombre} avatarUrl={usuario.avatarUrl} tam={76} />
        <div>
          <h1 className="t-display text-[20px]">{usuario.nombre}</h1>
          <p className="t-rotulo mt-1">
            @{usuario.usuario}
            {usuario.ciudad ? ` · ${usuario.ciudad}` : ''}
          </p>
          {seguidores > 0 || siguiendo > 0 ? (
            <p className="t-rotulo mt-0.5 tabular">
              {seguidores} {seguidores === 1 ? 'seguidor' : 'seguidores'} · sigue a {siguiendo}
            </p>
          ) : null}
        </div>
      </header>

      <section className="grid grid-cols-3 gap-2">
        <div className="tarjeta px-2 py-3 text-center">
          <p className="t-display text-[22px] text-verde-txt tabular">
            {asistencia === null ? '—' : `${asistencia}%`}
          </p>
          <p className="t-rotulo mt-1 text-[9.5px]">Asistencia</p>
        </div>
        <div className="tarjeta px-2 py-3 text-center">
          <p className="t-display text-[22px] tabular">{jugados}</p>
          <p className="t-rotulo mt-1 text-[9.5px]">Jugados</p>
        </div>
        <div className="tarjeta px-2 py-3 text-center">
          <p className="t-display text-[22px] tabular">{grupos}</p>
          <p className="t-rotulo mt-1 text-[9.5px]">Grupos</p>
        </div>
      </section>
      {asistencia === null ? (
        <p className="-mt-3 text-xs text-tinta-3">
          El % de asistencia aparece cuando el organizador pasa lista en tu primer partido jugado.
        </p>
      ) : null}

      <section className="grid grid-cols-3 gap-2">
        <div className="tarjeta px-2 py-3 text-center">
          <p className="t-display text-[22px] tabular">{estadisticas.organizados}</p>
          <p className="t-rotulo mt-1 text-[9.5px]">Organizados</p>
        </div>
        <div className="tarjeta px-2 py-3 text-center">
          <p className="t-display text-[22px] tabular">{estadisticas.jugadasPublicadas}</p>
          <p className="t-rotulo mt-1 text-[9.5px]">Jugadas</p>
        </div>
        <div className="tarjeta px-2 py-3 text-center">
          <p className="t-display text-[22px] text-verde-txt tabular">{estadisticas.puntos}</p>
          <p className="t-rotulo mt-1 text-[9.5px]">Puntos</p>
        </div>
      </section>

      {estadisticas.porDeporte.length > 0 ? (
        <section>
          <p className="t-rotulo mb-2">Jugados por deporte</p>
          <div className="flex flex-wrap gap-2">
            {estadisticas.porDeporte.map((fila) => (
              <span key={fila.deporte} className="chip-sel pointer-events-none tabular">
                {fila.deporte} × {fila.jugados}
              </span>
            ))}
          </div>
        </section>
      ) : null}

      {usuario.deportes.length > 0 ? (
        <section>
          <p className="t-rotulo mb-2">Deportes</p>
          <div className="flex flex-wrap gap-2">
            {usuario.deportes.map((relacion) => (
              <span
                key={relacion.deporteId}
                className={relacion.principal ? 'chip-sel chip-sel-activo' : 'chip-sel'}
              >
                {relacion.deporte.nombre}
                {relacion.principal ? ' · principal' : ''}
              </span>
            ))}
          </div>
        </section>
      ) : null}

      {historial.length > 0 ? (
        <section>
          <p className="t-rotulo mb-1">Historial</p>
          <div>
            {historial.map((participacion) => (
              <div
                key={participacion.id}
                className="flex items-center gap-3 border-b border-borde py-2.5 last:border-b-0"
              >
                <span
                  className="h-2 w-2 flex-shrink-0 rounded-full"
                  style={{
                    background: participacion.asistio ? 'var(--verde-txt)' : 'var(--gris-estado)',
                  }}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">
                    {participacion.partido.deporte.nombre} · {participacion.partido.lugarNombre}
                  </p>
                  <p className="text-xs text-tinta-3">
                    {participacion.partido.fecha.toLocaleDateString('es-AR', {
                      day: 'numeric',
                      month: 'short',
                      timeZone: 'America/Argentina/Buenos_Aires',
                    })}
                    {participacion.partido.resultado ? ` · ${participacion.partido.resultado}` : ''}
                  </p>
                </div>
                <span
                  className="text-xs font-semibold"
                  style={{ color: participacion.asistio ? 'var(--verde-txt)' : 'var(--tinta-3)' }}
                >
                  {participacion.asistio === null ? '—' : participacion.asistio ? 'Jugó' : 'No fue'}
                </span>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {usuario.tipoCuenta === 'CANCHA' ? <SeccionCanchas usuario={usuario} /> : null}

      <section className="flex flex-col gap-3">
        <p className="t-rotulo">Tus jugadas</p>
        <PublicarJugada invitacion="Subí una jugada" />
        {(await obtenerJugadas(usuario.id, { autorId: usuario.id }, 10)).map((jugada) => (
          <TarjetaJugada key={jugada.id} jugada={jugada} />
        ))}
      </section>

      <ListaBloqueados bloqueados={bloqueos.map((bloqueo) => bloqueo.bloqueado)} />

      <div className="grid grid-cols-2 gap-2">
        <a href="/perfil/editar" className="btn btn-secundario">
          Editar perfil
        </a>
        <a href="/grupos" className="btn btn-secundario">
          Mis grupos
        </a>
      </div>

      {usuario.rol === 'ADMIN' ? (
        <a href="/admin" className="btn btn-secundario">
          Backoffice
        </a>
      ) : null}

      <AccionesPerfil temaActual={usuario.tema} />
    </div>
  );
}

async function SeccionCanchas({
  usuario,
}: {
  usuario: {
    id: string;
    nombre: string;
    suscripcionHasta: Date | null;
    complejoNombre: string | null;
    verificacion: string;
  };
}) {
  const activa = suscripcionActiva(usuario);
  const canchas = await prisma.cancha.findMany({
    where: { duenoId: usuario.id },
    include: { deporte: true },
    orderBy: { creadoEn: 'desc' },
  });

  return (
    <section className="flex flex-col gap-3">
      <p className="t-rotulo">{usuario.complejoNombre ?? 'Tus canchas'}</p>

      <div className="tarjeta flex flex-col gap-2 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold">Verificación de titularidad</p>
            <p className="text-xs text-tinta-3">{ESTADOS_VERIFICACION[usuario.verificacion] ?? usuario.verificacion}</p>
          </div>
          <span
            className="h-2 w-2 shrink-0 rounded-full"
            style={{
              background:
                usuario.verificacion === 'VERIFICADA'
                  ? 'var(--verde-txt)'
                  : usuario.verificacion === 'EN_REVISION'
                    ? 'var(--naranja-txt)'
                    : usuario.verificacion === 'RECHAZADA'
                      ? 'var(--rojo)'
                      : 'var(--borde-2)',
            }}
          />
        </div>
        {usuario.verificacion !== 'VERIFICADA' && usuario.verificacion !== 'EN_REVISION' ? (
          <SubirComprobante nombreUsuario={usuario.nombre} />
        ) : null}
      </div>

      <div className="tarjeta flex items-center justify-between p-4">
        <div>
          <p className="text-sm font-semibold">Suscripción de dueño de cancha</p>
          <p className="text-xs text-tinta-3">
            {activa
              ? `Activa hasta el ${usuario.suscripcionHasta!.toLocaleDateString('es-AR', {
                  day: 'numeric',
                  month: 'long',
                  timeZone: 'America/Argentina/Buenos_Aires',
                })}.`
              : 'Inactiva: escribinos a hola@birteam.com para activarla.'}
          </p>
        </div>
        <span
          className="h-2 w-2 shrink-0 rounded-full"
          style={{ background: activa ? 'var(--verde-txt)' : 'var(--rojo)' }}
        />
      </div>

      {canchas.map((cancha) => (
        <a key={cancha.id} href={`/canchas/${cancha.id}`} className="tarjeta flex items-center gap-3 p-4">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{cancha.nombre}</p>
            <p className="t-rotulo mt-0.5">
              {cancha.deporte.nombre}
              {cancha.ciudad ? ` · ${cancha.ciudad}` : ''}
            </p>
          </div>
          <span
            className="text-xs font-semibold"
            style={{ color: cancha.activa && activa ? 'var(--verde-txt)' : 'var(--tinta-3)' }}
          >
            {cancha.activa && activa ? 'Publicada' : cancha.activa ? 'Oculta' : 'Pausada'}
          </span>
        </a>
      ))}

      {activa ? (
        <a href="/canchas/nueva" className="btn btn-secundario">
          {canchas.length > 0 ? 'Publicar otra cancha' : 'Publicar mi cancha'}
        </a>
      ) : null}
    </section>
  );
}
