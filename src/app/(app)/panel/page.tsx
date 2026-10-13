import Image from 'next/image';
import Link from 'next/link';
import { LogoEquipo } from '@/components/logo-equipo';
import { prisma } from '@/lib/db';
import { duenosQueGestiono } from '@/lib/gestion';
import { usuarioActual } from '@/lib/auth';
import { Avisos } from './avisos';
import { Pendientes } from './pendientes';
import { AvisoNovedad } from '@/components/aviso-novedad';
import { NOVEDADES } from '@/lib/ayuda';
import { cuandoEmpieza, ofertasVigentes, rotuloDia } from '@/lib/reservas';
import { formatearPlata, haceCuanto } from '@/lib/formato';
import { formatearDistancia, rotuloDistancia } from '@/lib/geo';
import { RADIOS_KM, kmHasta, ubicacionDe } from '@/lib/ubicacion';
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
    select: { id: true, tipo: true, titulo: true, cuerpo: true, url: true, creadoEn: true },
  });

  const mensajesSinLeer = await prisma.mensaje.count({
    where: { destinatarioId: usuario.id, leidoEn: null },
  });

  // Turnos de cancha: el próximo propio y, para dueños, los pedidos sin responder.
  const [proximoTurno, pedidosSinResponder] = await Promise.all([
    prisma.reserva.findFirst({
      where: {
        usuarioId: usuario.id,
        estado: { in: ['SOLICITADA', 'CONFIRMADA'] },
        inicio: { gte: hoy },
        cancha: { duenoId: { not: usuario.id } },
      },
      orderBy: { inicio: 'asc' },
      include: { cancha: { select: { nombre: true } } },
    }),
    duenosQueGestiono(usuario.id, usuario.tipoCuenta).then((duenos) =>
      duenos.length > 0
        ? prisma.reserva.count({
            where: { cancha: { duenoId: { in: duenos } }, estado: 'SOLICITADA', inicio: { gte: hoy } },
          })
        : 0
    ),
  ]);

  // Radar: turnos libres con descuento, de tu deporte si tenés uno.
  const deporteDelRadar =
    usuario.deportes.find((relacion) => relacion.principal)?.deporteId ?? usuario.deportes[0]?.deporteId;
  const ubicacion = await ubicacionDe(usuario);
  // Con ubicación, la oferta que se destaca es la más cercana.
  const radar = (await ofertasVigentes({ deporteId: deporteDelRadar }))
    .filter((oferta) => oferta.cancha.duenoId !== usuario.id)
    .map((oferta) => ({ ...oferta, km: kmHasta(ubicacion, oferta.cancha) }))
    .sort((a, b) => (ubicacion ? (a.km ?? Infinity) - (b.km ?? Infinity) : 0));

  // Cerca tuyo: partidos abiertos de tus deportes dentro de tu radio, a los
  // que todavía no te sumaste. Lo más cerca primero.
  const radioCerca = RADIOS_KM.find((km) => km >= usuario.radioKm) ?? RADIOS_KM[RADIOS_KM.length - 1];
  const cerca = ubicacion
    ? (
        await prisma.partido.findMany({
          where: {
            visibilidad: 'ABIERTO',
            estado: { in: ['ARMANDOSE', 'CONFIRMADO'] },
            listaCerrada: false,
            fecha: { gte: hoy },
            organizadorId: { not: usuario.id },
            participaciones: { none: { usuarioId: usuario.id } },
            ...(usuario.deportes.length > 0
              ? { deporteId: { in: usuario.deportes.map((relacion) => relacion.deporteId) } }
              : {}),
          },
          include: {
            deporte: { select: { nombre: true } },
            participaciones: { where: { estado: 'VOY' }, select: { id: true } },
          },
          orderBy: { fecha: 'asc' },
          take: 60,
        })
      )
        .map((partido) => ({ ...partido, km: kmHasta(ubicacion, partido) }))
        .filter((partido) => partido.km != null && partido.km <= radioCerca)
        .sort((a, b) => a.km! - b.km! || a.fecha.getTime() - b.fecha.getTime())
        .slice(0, 3)
    : [];

  // Desafíos: los que esperan tu respuesta y los abiertos de tus deportes.
  const [desafiosRecibidos, desafiosAbiertos] = await Promise.all([
    prisma.desafio.count({
      where: {
        estado: 'PENDIENTE',
        fecha: { gt: hoy },
        rival: { miembros: { some: { usuarioId: usuario.id, rol: 'ADMIN' } } },
      },
    }),
    prisma.desafio.count({
      where: {
        estado: 'PENDIENTE',
        rivalId: null,
        fecha: { gt: hoy },
        deporteId: { in: usuario.deportes.map((relacion) => relacion.deporteId) },
        retador: { miembros: { none: { usuarioId: usuario.id } } },
      },
    }),
  ]);

  // Lo que espera tu respuesta: un lugar liberado para vos (2 h para
  // confirmar) y los partidos a los que te invitaron y no contestaste.
  const hace30dias = new Date(hoy.getTime() - 30 * 86400_000);
  const [liberados, gruposMios, invitacionesRecibidas] = await Promise.all([
    prisma.participacion.findMany({
      where: {
        usuarioId: usuario.id,
        estado: 'ESPERA',
        invitacionExpiraEn: { gt: hoy },
        partido: { fecha: { gt: hoy }, estado: { in: ['ARMANDOSE', 'CONFIRMADO'] } },
      },
      include: { partido: { include: { deporte: { select: { nombre: true } } } } },
      orderBy: { invitacionExpiraEn: 'asc' },
    }),
    prisma.miembroGrupo.findMany({ where: { usuarioId: usuario.id }, select: { grupoId: true } }),
    prisma.notificacion.findMany({
      where: { usuarioId: usuario.id, tipo: 'INVITACION', creadoEn: { gte: hace30dias } },
      select: { url: true },
    }),
  ]);
  const idsInvitado = invitacionesRecibidas
    .map((n) => n.url?.match(/^\/partidos\/([^/?#]+)/)?.[1])
    .filter((id): id is string => Boolean(id));
  const invitaciones = await prisma.partido.findMany({
    where: {
      fecha: { gt: hoy },
      estado: { in: ['ARMANDOSE', 'CONFIRMADO'] },
      organizadorId: { not: usuario.id },
      listaCerrada: false,
      participaciones: { none: { usuarioId: usuario.id } },
      OR: [{ grupoId: { in: gruposMios.map((g) => g.grupoId) } }, { id: { in: idsInvitado } }],
    },
    include: { deporte: { select: { nombre: true } }, organizador: { select: { nombre: true } } },
    orderBy: { fecha: 'asc' },
    take: 3,
  });
  const cuando = (fecha: Date) =>
    `${DIAS[fecha.getDay()]} ${fecha.toLocaleTimeString('es-AR', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Argentina/Buenos_Aires',
    })}`;

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
          // En escritorio ya está en la cabecera de arriba.
          className="relative flex h-9 w-9 items-center justify-center rounded-[6px] border border-borde-2 text-tinta-2 lg:hidden"
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

      <Pendientes
        liberados={liberados.map((p) => ({
          partidoId: p.partidoId,
          titulo: `${p.partido.deporte.nombre} · ${cuando(p.partido.fecha)}`,
          lugar: p.partido.lugarNombre,
          hasta: p.invitacionExpiraEn!.toISOString(),
        }))}
        invitaciones={invitaciones.map((partido) => ({
          partidoId: partido.id,
          titulo: `${partido.deporte.nombre} · ${cuando(partido.fecha)}`,
          lugar: partido.lugarNombre,
          quien: partido.organizador.nombre.split(' ')[0],
        }))}
      />

      <Avisos avisos={avisos.map(({ creadoEn, ...aviso }) => ({ ...aviso, cuando: haceCuanto(creadoEn) }))} />

      {(() => {
        // La última novedad para esta persona: las de complejos, solo a dueños.
        const novedad = NOVEDADES.find(
          (n) => n.para === 'todos' || (n.para === 'complejos') === (usuario.tipoCuenta === 'CANCHA')
        );
        return novedad ? (
          <AvisoNovedad id={`${novedad.fecha}-${novedad.titulo}`} titulo={novedad.titulo} texto={novedad.texto} />
        ) : null;
      })()}

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

      {usuario.tipoCuenta === 'CANCHA' ? (
        <Link href="/complejo" className="tarjeta flex items-center justify-between gap-3 p-4">
          <div>
            <p className="t-rotulo text-verde-txt">Mi complejo</p>
            <p className="mt-0.5 text-sm font-semibold">Ocupación, turnos libres y lo cobrado</p>
          </div>
          <span className="t-display text-[16px] text-verde-txt">→</span>
        </Link>
      ) : null}

      {pedidosSinResponder > 0 ? (
        <Link href="/reservas" className="tarjeta flex items-center justify-between gap-3 p-4" style={{ borderColor: 'var(--naranja-txt)' }}>
          <div>
            <p className="t-rotulo text-naranja-txt">Pedidos de turno</p>
            <p className="mt-0.5 text-sm font-semibold">
              {pedidosSinResponder === 1
                ? 'Tenés 1 pedido esperando que lo confirmes'
                : `Tenés ${pedidosSinResponder} pedidos esperando que los confirmes`}
            </p>
          </div>
          <span className="t-display text-[16px] text-naranja-txt">→</span>
        </Link>
      ) : null}

      {radar.length > 0 ? (
        <Link href="/radar" className="tarjeta flex items-center justify-between gap-3 p-4" style={{ borderColor: 'var(--naranja-txt)' }}>
          <div className="min-w-0">
            <p className="t-rotulo text-naranja-txt">
              Radar · {radar.length} {radar.length === 1 ? 'turno libre' : 'turnos libres'} con descuento
            </p>
            <p className="mt-0.5 truncate text-sm font-semibold">
              {radar[0].descuento ? `−${radar[0].descuento}% · ` : ''}
              {radar[0].cancha.nombre}, {cuandoEmpieza(radar[0].inicio, radar[0].fecha, radar[0].hora)} a{' '}
              {formatearPlata(radar[0].precioOferta)}
              {radar[0].km != null ? ` · a ${formatearDistancia(radar[0].km)}` : ''}
            </p>
          </div>
          <span className="t-display text-[16px] text-naranja-txt">→</span>
        </Link>
      ) : null}

      {desafiosRecibidos > 0 || desafiosAbiertos > 0 ? (
        <Link href="/desafios" className="tarjeta flex items-center justify-between gap-3 p-4">
          <div>
            <p className="t-rotulo text-naranja-txt">Desafíos</p>
            <p className="mt-0.5 text-sm font-semibold">
              {desafiosRecibidos > 0
                ? `Tu grupo tiene ${desafiosRecibidos} ${desafiosRecibidos === 1 ? 'desafío' : 'desafíos'} para responder`
                : `${desafiosAbiertos} ${desafiosAbiertos === 1 ? 'grupo busca' : 'grupos buscan'} rival en tu deporte`}
            </p>
          </div>
          <span className="t-display text-[16px] text-naranja-txt">→</span>
        </Link>
      ) : null}

      {cerca.length > 0 ? (
        <section>
          <div className="mb-2 flex items-baseline justify-between">
            <p className="t-rotulo">
              Cerca tuyo · {ubicacion?.origen === 'dispositivo' ? 'desde donde estás' : `hasta ${radioCerca} km`}
            </p>
            <Link href={`/explorar?radio=${radioCerca}`} className="text-xs font-semibold text-verde-txt">
              Ver todos
            </Link>
          </div>
          <div className="tarjeta flex flex-col">
            {cerca.map((partido) => {
              const faltan = partido.cupo - partido.participaciones.length;
              return (
                <Link
                  key={partido.id}
                  href={`/partidos/${partido.id}`}
                  className="flex items-center gap-3 border-b border-borde px-4 py-3.5 last:border-b-0 hover:bg-fondo/40"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">
                      {partido.deporte.nombre} · {DIAS[partido.fecha.getDay()]}{' '}
                      {partido.fecha.toLocaleTimeString('es-AR', {
                        hour12: false,
                        hour: '2-digit',
                        minute: '2-digit',
                        timeZone: 'America/Argentina/Buenos_Aires',
                      })}
                    </span>
                    <span className="block truncate text-xs text-tinta-3">{partido.lugarNombre}</span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block text-xs font-semibold tabular text-tinta-2">
                      {rotuloDistancia(partido.km!, !partido.canchaId).replace(/^a /, '')}
                    </span>
                    <span
                      className="block text-[11px] font-semibold"
                      style={{ color: faltan > 0 ? 'var(--verde-txt)' : 'var(--azul-txt)' }}
                    >
                      {faltan > 0 ? `Faltan ${faltan}` : 'En espera'}
                    </span>
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      ) : null}

      {/* Atajos: una sola lista, no tres tarjetas iguales. */}
      <nav className="tarjeta flex flex-col" aria-label="Atajos">
        <Atajo
          href={proximoTurno ? '/reservas' : '/turnos'}
          titulo={proximoTurno ? 'Tu próximo turno' : 'Buscar turno'}
          detalle={
            proximoTurno
              ? `${rotuloDia(proximoTurno.fecha)} ${proximoTurno.hora} en ${proximoTurno.cancha.nombre}${
                  proximoTurno.estado === 'SOLICITADA' ? ', esperando confirmación' : ''
                }`
              : 'Canchas con turno libre hoy, a la hora que quieras'
          }
          icono={
            <>
              <rect x="3.5" y="5" width="17" height="15" rx="2" />
              <path d="M3.5 10h17M8 3v4M16 3v4" />
            </>
          }
        />
        <Atajo
          href={deportePrincipal ? `/comunidades/${deportePrincipal.slug}` : '/comunidades'}
          titulo={deportePrincipal ? `Comunidad de ${deportePrincipal.nombre}` : 'Comunidades'}
          detalle="Partidos abiertos, grupos y ranking"
          icono={
            <>
              <circle cx="9" cy="9" r="3.2" />
              <path d="M3.5 19c.6-3 2.8-4.6 5.5-4.6s4.9 1.6 5.5 4.6" />
              <circle cx="16.5" cy="8" r="2.5" />
              <path d="M16 13.5c2.4 0 4 1.4 4.5 4" />
            </>
          }
        />
        <Atajo
          href="/torneos"
          titulo="Torneos"
          detalle="Armá una liga o anotá a tu equipo"
          icono={
            <>
              <path d="M8 4h8v5a4 4 0 0 1-8 0z" />
              <path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8.5 20h7" />
            </>
          }
        />
      </nav>

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
                <LogoEquipo nombre={grupo.nombre} url={grupo.fotoUrl} tam={36} />
                <div className="min-w-0 flex-1">
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

function Atajo({
  href,
  titulo,
  detalle,
  icono,
}: {
  href: string;
  titulo: string;
  detalle: string;
  icono: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 border-b border-borde px-4 py-3.5 transition-colors last:border-b-0 hover:bg-fondo/40"
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="shrink-0 text-tinta-3"
        aria-hidden
      >
        {icono}
      </svg>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold">{titulo}</span>
        <span className="block truncate text-xs text-tinta-3">{detalle}</span>
      </span>
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" className="shrink-0 text-tinta-3" aria-hidden>
        <path d="m6 3.5 4.5 4.5L6 12.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </Link>
  );
}
