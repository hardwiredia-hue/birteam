import Link from 'next/link';
import Form from 'next/form';
import { prisma } from '@/lib/db';
import { usuarioActual } from '@/lib/auth';
import { distanciaKm, formatearDistancia } from '@/lib/geo';
import { formatearPlata } from '@/lib/formato';
import { normalizar } from '@/lib/normalizar';
import { idsBloqueados } from '@/lib/bloqueos';
import { calcularRanking } from '@/lib/estadisticas';
import { BotonSumarme } from '@/components/sumarse-grupo';
import { Avatar } from '@/components/avatar';
import { Mapa, type PuntoMapa } from '@/components/mapa';

export const metadata = { title: 'Explorar' };
export const dynamic = 'force-dynamic';

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

export default async function Explorar({
  searchParams,
}: {
  searchParams: Promise<{
    tab?: string;
    deporte?: string;
    q?: string;
    ambito?: string;
    vista?: string;
  }>;
}) {
  const { tab = 'partidos', deporte, q, ambito, vista } = await searchParams;
  const usuario = (await usuarioActual())!;
  const deportes = await prisma.deporte.findMany({
    orderBy: { orden: 'asc' },
    select: { id: true, nombre: true, slug: true },
  });

  return (
    <div className="flex flex-col gap-4">
      <h1 className="t-pantalla">Explorar</h1>

      <Form action="/explorar" className="flex gap-2">
        {tab !== 'partidos' ? <input type="hidden" name="tab" value={tab} /> : null}
        {deporte ? <input type="hidden" name="deporte" value={deporte} /> : null}
        {vista === 'mapa' ? <input type="hidden" name="vista" value="mapa" /> : null}
        <input
          id="buscador"
          name="q"
          className="campo"
          placeholder={tab === 'jugadores' ? 'Buscar por nombre, usuario o ciudad…' : 'Buscar por lugar o ciudad…'}
          defaultValue={q ?? ''}
        />
        <button type="submit" className="btn btn-secundario btn-sm">Buscar</button>
      </Form>

      <div className="flex gap-1 border-b border-borde">
        <Solapa activa={tab === 'partidos'} href="/explorar">Partidos</Solapa>
        <Solapa activa={tab === 'jugadores'} href="/explorar?tab=jugadores">Jugadores</Solapa>
        <Solapa activa={tab === 'grupos'} href="/explorar?tab=grupos">Grupos</Solapa>
        <Solapa activa={tab === 'canchas'} href="/explorar?tab=canchas">Canchas</Solapa>
        <Solapa activa={tab === 'ranking'} href="/explorar?tab=ranking">Ranking</Solapa>
      </div>

      {tab === 'ranking' ? (
        <>
          <div className="flex flex-wrap gap-2">
            {usuario.ciudad ? (
              <>
                <Link
                  href={`/explorar?tab=ranking${deporte ? `&deporte=${deporte}` : ''}`}
                  className={ambito !== 'todos' ? 'chip-sel chip-sel-activo' : 'chip-sel'}
                >
                  {usuario.ciudad}
                </Link>
                <Link
                  href={`/explorar?tab=ranking&ambito=todos${deporte ? `&deporte=${deporte}` : ''}`}
                  className={ambito === 'todos' ? 'chip-sel chip-sel-activo' : 'chip-sel'}
                >
                  Todo el país
                </Link>
              </>
            ) : null}
            {deportes.map((d) => (
              <Link
                key={d.id}
                href={
                  d.slug === deporte
                    ? `/explorar?tab=ranking${ambito === 'todos' ? '&ambito=todos' : ''}`
                    : `/explorar?tab=ranking&deporte=${d.slug}${ambito === 'todos' ? '&ambito=todos' : ''}`
                }
                className={d.slug === deporte ? 'chip-sel chip-sel-activo' : 'chip-sel'}
              >
                {d.nombre}
              </Link>
            ))}
          </div>
          <Ranking
            usuarioId={usuario.id}
            deporteSlug={deporte}
            soloCiudad={ambito === 'todos' ? null : usuario.ciudad}
          />
        </>
      ) : tab === 'jugadores' ? (
        <Jugadores q={q} miId={usuario.id} />
      ) : tab === 'grupos' ? (
        <GruposAbiertos q={q} usuario={usuario} />
      ) : tab === 'canchas' ? (
        <>
          <AlternarVista tab="canchas" deporte={deporte} q={q} vista={vista} />
          <div className="flex flex-wrap gap-2">
            {deportes.map((d) => (
              <Link
                key={d.id}
                href={armarUrl({
                  tab: 'canchas',
                  deporte: d.slug === deporte ? undefined : d.slug,
                  q,
                  vista,
                })}
                className={d.slug === deporte ? 'chip-sel chip-sel-activo' : 'chip-sel'}
              >
                {d.nombre}
              </Link>
            ))}
          </div>
          <Canchas deporte={deporte} q={q} usuario={usuario} vista={vista} />
        </>
      ) : (
        <>
          <AlternarVista deporte={deporte} q={q} vista={vista} />
          <div className="flex flex-wrap gap-2">
            {deportes.map((d) => (
              <Link
                key={d.id}
                href={armarUrl({ deporte: d.slug === deporte ? undefined : d.slug, q, vista })}
                className={d.slug === deporte ? 'chip-sel chip-sel-activo' : 'chip-sel'}
              >
                {d.nombre}
              </Link>
            ))}
          </div>
          <Partidos deporte={deporte} q={q} usuario={usuario} vista={vista} />
        </>
      )}
    </div>
  );
}

/** Arma la URL de Explorar conservando solo los parámetros con valor. */
function armarUrl(parametros: Record<string, string | undefined>) {
  const partes = Object.entries(parametros)
    .filter(([, valor]) => valor)
    .map(([clave, valor]) => `${clave}=${encodeURIComponent(valor!)}`);
  return `/explorar${partes.length > 0 ? `?${partes.join('&')}` : ''}`;
}

/** Lista o mapa, para partidos y canchas. */
function AlternarVista({
  tab,
  deporte,
  q,
  vista,
}: {
  tab?: string;
  deporte?: string;
  q?: string;
  vista?: string;
}) {
  return (
    <div className="flex gap-2">
      <Link
        href={armarUrl({ tab, deporte, q })}
        className={vista !== 'mapa' ? 'chip-sel chip-sel-activo' : 'chip-sel'}
      >
        Lista
      </Link>
      <Link
        href={armarUrl({ tab, deporte, q, vista: 'mapa' })}
        className={vista === 'mapa' ? 'chip-sel chip-sel-activo' : 'chip-sel'}
      >
        Mapa
      </Link>
    </div>
  );
}

function Solapa({ activa, href, children }: { activa: boolean; href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="flex-1 border-b-2 pb-2 text-center text-sm font-semibold"
      style={{
        borderColor: activa ? 'var(--verde)' : 'transparent',
        color: activa ? 'var(--tinta)' : 'var(--tinta-3)',
      }}
    >
      {children}
    </Link>
  );
}

async function Partidos({
  deporte,
  q,
  usuario,
  vista,
}: {
  deporte?: string;
  q?: string;
  usuario: { latitud: number | null; longitud: number | null };
  vista?: string;
}) {
  const partidos = await prisma.partido.findMany({
    where: {
      visibilidad: 'ABIERTO',
      estado: { in: ['ARMANDOSE', 'CONFIRMADO'] },
      fecha: { gte: new Date() },
      ...(deporte ? { deporte: { slug: deporte } } : {}),
    },
    include: {
      deporte: true,
      participaciones: { where: { estado: 'VOY' }, select: { id: true } },
    },
    orderBy: { fecha: 'asc' },
    take: 80,
  });

  // Filtro de texto sin tildes, y distancia si el usuario tiene coordenadas.
  const buscado = q ? normalizar(q) : null;
  const lista = partidos
    .filter((p) =>
      !buscado
        ? true
        : normalizar(`${p.lugarNombre} ${p.ciudad ?? ''} ${p.provincia ?? ''}`).includes(buscado)
    )
    .map((p) => ({
      ...p,
      km:
        usuario.latitud != null && usuario.longitud != null && p.latitud != null && p.longitud != null
          ? distanciaKm(usuario.latitud, usuario.longitud, p.latitud, p.longitud)
          : null,
    }))
    .sort((a, b) => (a.km ?? Infinity) - (b.km ?? Infinity) || a.fecha.getTime() - b.fecha.getTime());

  if (lista.length === 0) {
    return (
      <div className="tarjeta p-5">
        <p className="text-sm text-tinta-2">
          No hay partidos abiertos {buscado ? 'con esa búsqueda' : 'por ahora'}. Armá el tuyo y
          compartilo: aparece acá para los jugadores de tu zona.
        </p>
        <Link href="/crear" className="btn btn-primario mt-4">Creá el partido</Link>
      </div>
    );
  }

  if (vista === 'mapa') {
    const puntos: PuntoMapa[] = lista
      .filter((p) => p.latitud != null && p.longitud != null)
      .map((p) => ({
        id: p.id,
        latitud: p.latitud!,
        longitud: p.longitud!,
        titulo: `${p.deporte.nombre} · ${DIAS[p.fecha.getDay()]} ${p.fecha.toLocaleTimeString(
          'es-AR',
          { hour12: false, hour: '2-digit', minute: '2-digit', timeZone: 'America/Argentina/Buenos_Aires' }
        )}`,
        subtitulo: `${p.lugarNombre}${p.ciudad ? ` · ${p.ciudad}` : ''}`,
        url: `/partidos/${p.id}`,
        color: 'verde' as const,
      }));
    return (
      <>
        <Mapa
          puntos={puntos}
          centro={
            usuario.latitud != null && usuario.longitud != null
              ? { latitud: usuario.latitud, longitud: usuario.longitud }
              : null
          }
        />
        {puntos.length < lista.length ? (
          <p className="text-xs text-tinta-3">
            {lista.length - puntos.length}{' '}
            {lista.length - puntos.length === 1
              ? 'partido no tiene ubicación en el mapa'
              : 'partidos no tienen ubicación en el mapa'}
            : está{lista.length - puntos.length === 1 ? '' : 'n'} en la vista Lista.
          </p>
        ) : null}
      </>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {lista.map((p) => {
        const voy = p.participaciones.length;
        const faltan = p.cupo - voy;
        const hora = p.fecha.toLocaleTimeString('es-AR', {
          hour12: false, hour: '2-digit',
          minute: '2-digit',
          timeZone: 'America/Argentina/Buenos_Aires',
        });
        return (
          <Link key={p.id} href={`/partidos/${p.id}`} className="tarjeta flex flex-col gap-2 p-4">
            <div className="flex items-baseline justify-between gap-3">
              <span className="t-rotulo text-verde-txt">{p.deporte.nombre}</span>
              {p.km != null ? (
                <span className="t-rotulo tabular">a {formatearDistancia(p.km)}</span>
              ) : null}
            </div>
            <p className="t-display text-[19px]">
              {DIAS[p.fecha.getDay()]} {hora}
            </p>
            <p className="text-[13px] text-tinta-2">
              {p.lugarNombre}
              {p.ciudad ? ` · ${p.ciudad}` : ''}
            </p>
            <div className="flex items-baseline justify-between">
              <span
                className="text-xs font-semibold"
                style={{ color: faltan > 0 ? 'var(--verde-txt)' : 'var(--azul-txt)' }}
              >
                {faltan > 0 ? `Faltan ${faltan}` : 'Completo · anotate en espera'}
              </span>
              {p.costoPorJugador ? (
                <span className="text-xs font-semibold tabular">{formatearPlata(p.costoPorJugador)}</span>
              ) : (
                <span className="text-xs text-tinta-3">gratis</span>
              )}
            </div>
          </Link>
        );
      })}
    </div>
  );
}

async function Canchas({
  deporte,
  q,
  usuario,
  vista,
}: {
  deporte?: string;
  q?: string;
  usuario: { tipoCuenta: string; latitud: number | null; longitud: number | null };
  vista?: string;
}) {
  const canchas = await prisma.cancha.findMany({
    where: {
      activa: true,
      // Solo publicaciones de dueños con la suscripción al día.
      dueno: { suscripcionHasta: { gt: new Date() } },
      ...(deporte ? { deporte: { slug: deporte } } : {}),
    },
    include: { deporte: true },
    orderBy: { creadoEn: 'desc' },
    take: 80,
  });

  const buscado = q ? normalizar(q) : null;
  const lista = canchas
    .filter((c) =>
      !buscado
        ? true
        : normalizar(`${c.nombre} ${c.direccion} ${c.ciudad ?? ''} ${c.provincia ?? ''}`).includes(
            buscado
          )
    )
    .map((c) => ({
      ...c,
      km:
        usuario.latitud != null && usuario.longitud != null && c.latitud != null && c.longitud != null
          ? distanciaKm(usuario.latitud, usuario.longitud, c.latitud, c.longitud)
          : null,
    }))
    .sort((a, b) => (a.km ?? Infinity) - (b.km ?? Infinity))
    .slice(0, 30);

  if (lista.length === 0) {
    return (
      <div className="tarjeta p-5">
        <p className="text-sm text-tinta-2">
          Todavía no hay canchas publicadas {buscado ? 'con esa búsqueda' : 'por acá'}.
          {usuario.tipoCuenta === 'CANCHA' ? ' La tuya puede ser la primera.' : ''}
        </p>
        {usuario.tipoCuenta === 'CANCHA' ? (
          <Link href="/canchas/nueva" className="btn btn-primario mt-4">Publicar mi cancha</Link>
        ) : null}
      </div>
    );
  }

  if (vista === 'mapa') {
    const puntos: PuntoMapa[] = lista
      .filter((c) => c.latitud != null && c.longitud != null)
      .map((c) => ({
        id: c.id,
        latitud: c.latitud!,
        longitud: c.longitud!,
        titulo: c.nombre,
        subtitulo: `${c.deporte.nombre} · ${
          c.precioPorHora ? `${formatearPlata(c.precioPorHora)} la hora` : 'precio a consultar'
        }`,
        url: `/canchas/${c.id}`,
        color: 'naranja' as const,
      }));
    return (
      <>
        <Mapa
          puntos={puntos}
          centro={
            usuario.latitud != null && usuario.longitud != null
              ? { latitud: usuario.latitud, longitud: usuario.longitud }
              : null
          }
        />
        {puntos.length < lista.length ? (
          <p className="text-xs text-tinta-3">
            {lista.length - puntos.length}{' '}
            {lista.length - puntos.length === 1
              ? 'cancha no tiene ubicación en el mapa'
              : 'canchas no tienen ubicación en el mapa'}
            : está{lista.length - puntos.length === 1 ? '' : 'n'} en la vista Lista.
          </p>
        ) : null}
      </>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {lista.map((c) => {
        let foto: string | null = null;
        try {
          foto = (JSON.parse(c.fotos) as string[])[0] ?? null;
        } catch {
          foto = null;
        }
        return (
          <Link key={c.id} href={`/canchas/${c.id}`} className="tarjeta flex gap-3 p-4">
            {foto ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={foto}
                alt={c.nombre}
                className="h-[72px] w-[72px] shrink-0 rounded-[6px] border border-borde object-cover"
              />
            ) : null}
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-3">
                <span className="t-rotulo text-verde-txt">{c.deporte.nombre}</span>
                {c.km != null ? (
                  <span className="t-rotulo tabular">a {formatearDistancia(c.km)}</span>
                ) : null}
              </div>
              <p className="t-display mt-1 truncate text-[18px]">{c.nombre}</p>
              <p className="truncate text-[13px] text-tinta-2">
                {c.direccion}
                {c.ciudad ? ` · ${c.ciudad}` : ''}
              </p>
              <p className="mt-1 text-xs font-semibold tabular text-naranja-txt">
                {c.precioPorHora ? `${formatearPlata(c.precioPorHora)} la hora` : 'Precio a consultar'}
              </p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

async function Ranking({
  usuarioId,
  deporteSlug,
  soloCiudad,
}: {
  usuarioId: string;
  deporteSlug?: string;
  soloCiudad?: string | null;
}) {
  const { filas, mia } = await calcularRanking(usuarioId, { deporteSlug, soloCiudad });

  if (filas.length === 0) {
    return (
      <div className="tarjeta p-5">
        <p className="text-sm text-tinta-2">
          Todavía no hay partidos jugados {soloCiudad ? `en ${soloCiudad}` : ''} para armar el
          ranking. Se suma jugando: 3 puntos por partido jugado y 2 por organizarlo.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-tinta-3">
        3 puntos por partido jugado · 2 por partido organizado. Cuenta lo jugado de verdad, con
        lista pasada.
      </p>
      <div>
        {filas.map((fila) => {
          const soyYo = fila.usuario.id === usuarioId;
          return (
            <Link
              key={fila.usuario.id}
              href={soyYo ? '/perfil' : `/jugadores/${fila.usuario.usuario}`}
              className="flex items-center gap-3 border-b border-borde py-2.5 last:border-b-0"
              style={soyYo ? { background: 'rgba(168,230,23,0.06)' } : undefined}
            >
              <span
                className="t-display w-8 text-center text-[17px] tabular"
                style={{ color: fila.posicion <= 3 ? 'var(--verde-txt)' : 'var(--tinta-3)' }}
              >
                {fila.posicion}
              </span>
              <Avatar nombre={fila.usuario.nombre} avatarUrl={fila.usuario.avatarUrl} tam={32} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">
                  {fila.usuario.nombre}
                  {soyYo ? ' · vos' : ''}
                </p>
                <p className="text-xs text-tinta-3">
                  {fila.jugados} jugados · {fila.organizados} organizados
                  {fila.usuario.ciudad && !soloCiudad ? ` · ${fila.usuario.ciudad}` : ''}
                </p>
              </div>
              <span className="t-display text-[17px] text-verde-txt tabular">{fila.puntos} pts</span>
            </Link>
          );
        })}
      </div>
      {mia && mia.posicion > filas.length ? (
        <div className="tarjeta flex items-center gap-3 p-3.5">
          <span className="t-display w-8 text-center text-[17px] tabular text-tinta-3">
            {mia.posicion}
          </span>
          <p className="flex-1 text-sm font-semibold">Vos</p>
          <span className="t-display text-[17px] text-verde-txt tabular">{mia.puntos} pts</span>
        </div>
      ) : null}
    </div>
  );
}

async function GruposAbiertos({
  q,
  usuario,
}: {
  q?: string;
  usuario: { id: string; ciudad: string | null };
}) {
  const filtro = q ? normalizar(q) : null;
  const grupos = await prisma.grupo.findMany({
    where: {
      abierto: true,
      miembros: { none: { usuarioId: usuario.id } },
    },
    include: { deporte: true, _count: { select: { miembros: true } } },
    orderBy: { creadoEn: 'desc' },
    take: 60,
  });

  // Primero los de tu ciudad; filtro de texto sin tildes.
  const lista = grupos
    .filter((grupo) =>
      !filtro
        ? true
        : normalizar(`${grupo.nombre} ${grupo.ciudad ?? ''} ${grupo.deporte.nombre}`).includes(filtro)
    )
    .sort((a, b) => {
      const aCerca = usuario.ciudad && a.ciudad === usuario.ciudad ? 0 : 1;
      const bCerca = usuario.ciudad && b.ciudad === usuario.ciudad ? 0 : 1;
      return aCerca - bCerca;
    })
    .slice(0, 25);

  if (lista.length === 0) {
    return (
      <div className="tarjeta p-5">
        <p className="text-sm text-tinta-2">
          No hay grupos abiertos {filtro ? 'con esa búsqueda' : 'para sumarte por ahora'}. Armá el
          tuyo e invitá gente: crece solo.
        </p>
        <Link href="/grupos/nuevo" className="btn btn-primario mt-4">Crear mi grupo</Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {lista.map((grupo) => (
        <div key={grupo.id} className="tarjeta flex items-center gap-3 p-4">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{grupo.nombre}</p>
            <p className="t-rotulo mt-0.5">
              {grupo.deporte.nombre} · {grupo._count.miembros}{' '}
              {grupo._count.miembros === 1 ? 'miembro' : 'miembros'}
              {grupo.ciudad ? ` · ${grupo.ciudad}` : ''}
            </p>
            {grupo.descripcion ? (
              <p className="mt-1 truncate text-xs text-tinta-3">{grupo.descripcion}</p>
            ) : null}
          </div>
          <BotonSumarme grupoId={grupo.id} />
        </div>
      ))}
    </div>
  );
}

async function Jugadores({ q, miId }: { q?: string; miId: string }) {
  const filtro = q?.trim();
  const ocultos = await idsBloqueados(miId);
  const jugadores = await prisma.usuario.findMany({
    where: {
      id: { not: miId, notIn: ocultos },
      ...(filtro
        ? {
            OR: [
              { nombre: { contains: filtro } },
              { usuario: { contains: filtro.toLowerCase() } },
              { ciudad: { contains: filtro } },
            ],
          }
        : {}),
    },
    include: { deportes: { include: { deporte: true }, orderBy: { principal: 'desc' } } },
    orderBy: { creadoEn: 'desc' },
    take: 25,
  });

  if (jugadores.length === 0) {
    return (
      <div className="tarjeta p-5">
        <p className="text-sm text-tinta-2">No encontramos jugadores con esa búsqueda.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {jugadores.map((jugador) => (
        <Link
          key={jugador.id}
          href={`/jugadores/${jugador.usuario}`}
          className="flex items-center gap-3 border-b border-borde py-3 last:border-b-0"
        >
          <Avatar nombre={jugador.nombre} avatarUrl={jugador.avatarUrl} tam={36} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{jugador.nombre}</p>
            <p className="text-xs text-tinta-3">
              @{jugador.usuario}
              {jugador.ciudad ? ` · ${jugador.ciudad}` : ''}
            </p>
          </div>
          {jugador.deportes[0] ? (
            <span className="chip-sel pointer-events-none text-[11px]">
              {jugador.deportes[0].deporte.nombre}
            </span>
          ) : null}
        </Link>
      ))}
    </div>
  );
}
