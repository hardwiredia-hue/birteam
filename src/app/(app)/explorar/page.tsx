import Link from 'next/link';
import { leerDisponibilidad, puedeJugar } from '@/lib/disponibilidad';
import { LogoEquipo } from '@/components/logo-equipo';
import Form from 'next/form';
import { prisma } from '@/lib/db';
import { ROTULOS_NIVEL } from '@/lib/constantes';
import { slugsDelFiltro } from '@/lib/deportes';
import { ChipsDeportes } from '@/components/chips-deportes';
import { formatearPuntaje, puntajesDeCanchas } from '@/lib/resenas';
import { usuarioActual } from '@/lib/auth';
import { formatearDistancia, rotuloDistancia } from '@/lib/geo';
import { dentroDelRadio, kmHasta, radioDelParametro, ubicacionDe, type Ubicacion } from '@/lib/ubicacion';
import { FiltroCercania } from '@/components/filtro-cercania';
import { formatearPlata, diaDeLaSemana } from '@/lib/formato';
import { normalizar } from '@/lib/normalizar';
import { idsBloqueados } from '@/lib/bloqueos';
import { calcularRanking } from '@/lib/estadisticas';
import { BotonSumarme } from '@/components/sumarse-grupo';
import { Avatar } from '@/components/avatar';
import { Mapa, type PuntoMapa } from '@/components/mapa';
import { filtrarPartidos } from '@/lib/filtros-partidos';

/** Filtros de Explorar → Partidos. */
const FILTROS_PARTIDO = [
  { valor: 'nivel', rotulo: 'Para mi nivel' },
  { valor: 'faltan', rotulo: 'Les faltan jugadores' },
];

/** Los servicios por los que se puede filtrar en Explorar → Canchas. */
const FILTROS_SERVICIO = [
  { valor: 'ILUMINACION', rotulo: 'Con iluminación' },
  { valor: 'VESTUARIOS', rotulo: 'Con vestuarios' },
  { valor: 'ESTACIONAMIENTO', rotulo: 'Con estacionamiento' },
];

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
    radio?: string;
    techada?: string;
    con?: string;
    solo?: string;
    orden?: string;
  }>;
}) {
  const { tab = 'partidos', deporte, q, ambito, vista, radio: radioCrudo, techada: techadaCruda, con: conCrudo, solo: soloCrudo, orden: ordenCrudo } = await searchParams;
  // Solapa Canchas: "Más baratas primero" (si no, por cercanía).
  const orden = tab === 'canchas' && ordenCrudo === 'precio' ? 'precio' : undefined;
  // "Solo techadas" y "con iluminación…" (solapa Canchas): se mantienen al
  // cambiar de deporte, vista o distancia.
  const techada = tab === 'canchas' && techadaCruda === '1' ? '1' : undefined;
  const servicios = tab === 'canchas' ? FILTROS_SERVICIO.filter((f) => (conCrudo ?? '').split(',').includes(f.valor)).map((f) => f.valor) : [];
  const con = servicios.length > 0 ? servicios.join(',') : undefined;
  // Solapa Partidos: "Para mi nivel" y "Les faltan jugadores".
  const filtrosPartido = tab === 'partidos' ? FILTROS_PARTIDO.filter((f) => (soloCrudo ?? '').split(',').includes(f.valor)).map((f) => f.valor) : [];
  const solo = filtrosPartido.length > 0 ? filtrosPartido.join(',') : undefined;
  const alternarFiltroPartido = (valor: string) => {
    const nuevos = filtrosPartido.includes(valor) ? filtrosPartido.filter((v) => v !== valor) : [...filtrosPartido, valor];
    return nuevos.length > 0 ? nuevos.join(',') : undefined;
  };
  const alternarServicio = (valor: string) => {
    const nuevos = servicios.includes(valor) ? servicios.filter((v) => v !== valor) : [...servicios, valor];
    return nuevos.length > 0 ? nuevos.join(',') : undefined;
  };
  const usuario = (await usuarioActual())!;
  const ubicacion = await ubicacionDe(usuario);
  const radio = ubicacion ? radioDelParametro(radioCrudo) : null;
  // El radio se mantiene al cambiar de solapa, deporte o vista.
  const r = radio ? String(radio) : undefined;
  const cercania = (
    <FiltroCercania
      ubicacion={ubicacion}
      ciudad={usuario.ciudad}
      radio={radio}
      href={(km) =>
        armarUrl({ tab: tab === 'partidos' ? undefined : tab, deporte, q, vista, radio: km ? String(km) : undefined, techada, con, solo, orden })
      }
    />
  );
  const deportes = await prisma.deporte.findMany({
    orderBy: { orden: 'asc' },
    select: { id: true, nombre: true, slug: true },
  });
  // "futbol" filtra 5, 7 y 11; un slug suelto (links viejos) sigue andando.
  const slugsFiltro = slugsDelFiltro(deporte, deportes);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="t-pantalla">Explorar</h1>

      <Form action="/explorar" className="flex gap-2">
        {tab !== 'partidos' ? <input type="hidden" name="tab" value={tab} /> : null}
        {deporte ? <input type="hidden" name="deporte" value={deporte} /> : null}
        {vista === 'mapa' ? <input type="hidden" name="vista" value="mapa" /> : null}
        {r ? <input type="hidden" name="radio" value={r} /> : null}
        {techada ? <input type="hidden" name="techada" value="1" /> : null}
        {con ? <input type="hidden" name="con" value={con} /> : null}
        {solo ? <input type="hidden" name="solo" value={solo} /> : null}
        {orden ? <input type="hidden" name="orden" value={orden} /> : null}
        <input
          id="buscador"
          name="q"
          aria-label="Buscar"
          className="campo"
          placeholder={tab === 'jugadores' ? 'Buscar por nombre, usuario o ciudad…' : 'Buscar por lugar o ciudad…'}
          defaultValue={q ?? ''}
        />
        <button type="submit" className="btn btn-secundario btn-sm">Buscar</button>
      </Form>

      <div className="flex gap-1 border-b border-borde">
        <Solapa activa={tab === 'partidos'} href={armarUrl({ radio: r })}>Partidos</Solapa>
        <Solapa activa={tab === 'jugadores'} href="/explorar?tab=jugadores">Jugadores</Solapa>
        <Solapa activa={tab === 'grupos'} href={armarUrl({ tab: 'grupos', radio: r })}>Grupos</Solapa>
        <Solapa activa={tab === 'canchas'} href={armarUrl({ tab: 'canchas', radio: r })}>Canchas</Solapa>
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
            <ChipsDeportes
              deportes={deportes}
              activo={deporte}
              conTodos={false}
              envolver="contenido"
              href={(clave) =>
                `/explorar?tab=ranking${clave ? `&deporte=${clave}` : ''}${ambito === 'todos' ? '&ambito=todos' : ''}`
              }
            />
          </div>
          <Ranking
            usuarioId={usuario.id}
            deporteSlugs={slugsFiltro}
            soloCiudad={ambito === 'todos' ? null : usuario.ciudad}
          />
        </>
      ) : tab === 'jugadores' ? (
        <>
          <div className="flex flex-wrap gap-2">
            <Link
              href={soloCrudo === 'hoy' ? `/explorar?tab=jugadores${q ? `&q=${encodeURIComponent(q)}` : ''}` : `/explorar?tab=jugadores&solo=hoy${q ? `&q=${encodeURIComponent(q)}` : ''}`}
              aria-pressed={soloCrudo === 'hoy'}
              className={soloCrudo === 'hoy' ? 'chip-sel chip-sel-activo' : 'chip-sel'}
            >
              Pueden hoy a esta hora
            </Link>
          </div>
          <Jugadores q={q} miId={usuario.id} disponiblesAhora={soloCrudo === 'hoy'} />
        </>
      ) : tab === 'grupos' ? (
        <>
          <Link href="/desafios" className="tarjeta flex items-center justify-between gap-2 p-3">
            <span>
              <span className="t-rotulo block text-naranja-txt">Buscador de rivales</span>
              <span className="block text-xs font-semibold">Desafiá a otro grupo o aceptá un desafío abierto</span>
            </span>
            <span className="text-naranja-txt">→</span>
          </Link>
          {cercania}
          <GruposAbiertos q={q} usuario={usuario} ubicacion={ubicacion} radio={radio} />
        </>
      ) : tab === 'canchas' ? (
        <>
          <AlternarVista tab="canchas" deporte={deporte} q={q} vista={vista} radio={r} techada={techada} con={con} orden={orden} />
          <div className="flex gap-2">
            <Link href={deporte ? `/radar?deporte=${deporte}` : '/radar'} className="tarjeta flex flex-1 items-center justify-between gap-2 p-3">
              <span>
                <span className="t-rotulo block text-naranja-txt">Radar</span>
                <span className="block text-xs font-semibold">Turnos libres con descuento</span>
              </span>
              <span className="text-naranja-txt">→</span>
            </Link>
            <Link href={deporte ? `/turnos?deporte=${deporte}` : '/turnos'} className="tarjeta flex flex-1 items-center justify-between gap-2 p-3">
              <span>
                <span className="t-rotulo block text-verde-txt">Buscar turno</span>
                <span className="block text-xs font-semibold">Libres por día y hora</span>
              </span>
              <span className="text-verde-txt">→</span>
            </Link>
          </div>
          <ChipsDeportes
            deportes={deportes}
            activo={deporte}
            conTodos={false}
            envolver
            href={(clave) => armarUrl({ tab: 'canchas', deporte: clave ?? undefined, q, vista, radio: r, techada, con, orden })}
          />
          <div className="flex flex-wrap gap-2">
            <Link
              href={armarUrl({ tab: 'canchas', deporte, q, vista, radio: r, techada: techada ? undefined : '1', con, orden })}
              aria-pressed={Boolean(techada)}
              className={techada ? 'chip-sel chip-sel-activo' : 'chip-sel'}
            >
              Solo techadas
            </Link>
            {FILTROS_SERVICIO.map((filtro) => (
              <Link
                key={filtro.valor}
                href={armarUrl({ tab: 'canchas', deporte, q, vista, radio: r, techada, con: alternarServicio(filtro.valor), orden })}
                aria-pressed={servicios.includes(filtro.valor)}
                className={servicios.includes(filtro.valor) ? 'chip-sel chip-sel-activo' : 'chip-sel'}
              >
                {filtro.rotulo}
              </Link>
            ))}
            <Link
              href={armarUrl({ tab: 'canchas', deporte, q, vista, radio: r, techada, con, orden: orden ? undefined : 'precio' })}
              aria-pressed={Boolean(orden)}
              className={orden ? 'chip-sel chip-sel-activo' : 'chip-sel'}
            >
              Más baratas primero
            </Link>
          </div>
          {cercania}
          <Canchas
            deporteSlugs={slugsFiltro}
            q={q}
            usuario={usuario}
            vista={vista}
            ubicacion={ubicacion}
            radio={radio}
            soloTechadas={Boolean(techada)}
            servicios={servicios}
            porPrecio={orden === 'precio'}
          />
        </>
      ) : (
        <>
          <AlternarVista deporte={deporte} q={q} vista={vista} radio={r} solo={solo} />
          <ChipsDeportes
            deportes={deportes}
            activo={deporte}
            conTodos={false}
            envolver
            href={(clave) => armarUrl({ deporte: clave ?? undefined, q, vista, radio: r, solo })}
          />
          <div className="flex flex-wrap gap-2">
            {FILTROS_PARTIDO.map((filtro) => (
              <Link
                key={filtro.valor}
                href={armarUrl({ deporte, q, vista, radio: r, solo: alternarFiltroPartido(filtro.valor) })}
                aria-pressed={filtrosPartido.includes(filtro.valor)}
                className={filtrosPartido.includes(filtro.valor) ? 'chip-sel chip-sel-activo' : 'chip-sel'}
              >
                {filtro.rotulo}
              </Link>
            ))}
          </div>
          {cercania}
          <Partidos
            deporteSlugs={slugsFiltro}
            q={q}
            vista={vista}
            ubicacion={ubicacion}
            radio={radio}
            paraMiNivel={filtrosPartido.includes('nivel') ? new Map(usuario.deportes.map((d) => [d.deporteId, d.nivel])) : null}
            soloConLugar={filtrosPartido.includes('faltan')}
          />
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
  radio,
  techada,
  con,
  solo,
  orden,
}: {
  tab?: string;
  deporte?: string;
  q?: string;
  vista?: string;
  radio?: string;
  techada?: string;
  con?: string;
  solo?: string;
  orden?: string;
}) {
  return (
    <div className="flex gap-2">
      <Link
        href={armarUrl({ tab, deporte, q, radio, techada, con, solo, orden })}
        className={vista !== 'mapa' ? 'chip-sel chip-sel-activo' : 'chip-sel'}
      >
        Lista
      </Link>
      <Link
        href={armarUrl({ tab, deporte, q, vista: 'mapa', radio, techada, con, solo, orden })}
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
  deporteSlugs,
  q,
  vista,
  ubicacion,
  radio,
  paraMiNivel,
  soloConLugar,
}: {
  deporteSlugs?: string[] | null;
  q?: string;
  vista?: string;
  ubicacion: Ubicacion | null;
  radio: number | null;
  /** Mi nivel por deporte: deja los partidos sin nivel o del mío (sin nivel cargado, todos). */
  paraMiNivel: Map<string, string | null> | null;
  /** Solo los que todavía tienen lugar. */
  soloConLugar: boolean;
}) {
  const partidos = await prisma.partido.findMany({
    where: {
      visibilidad: 'ABIERTO',
      estado: { in: ['ARMANDOSE', 'CONFIRMADO'] },
      listaCerrada: false,
      fecha: { gte: new Date() },
      ...(deporteSlugs ? { deporte: { slug: { in: deporteSlugs } } } : {}),
    },
    include: {
      deporte: true,
      participaciones: { where: { estado: 'VOY' }, select: { id: true } },
    },
    orderBy: { fecha: 'asc' },
    take: 80,
  });

  // Filtro de texto sin tildes, y distancia si hay desde dónde medir.
  const buscado = q ? normalizar(q) : null;
  const lista = filtrarPartidos(partidos, { paraMiNivel, soloConLugar })
    .filter((p) =>
      !buscado
        ? true
        : normalizar(`${p.lugarNombre} ${p.ciudad ?? ''} ${p.provincia ?? ''}`).includes(buscado)
    )
    .map((p) => ({ ...p, km: kmHasta(ubicacion, p) }))
    .filter((p) => dentroDelRadio(p.km, radio))
    .sort((a, b) => (a.km ?? Infinity) - (b.km ?? Infinity) || a.fecha.getTime() - b.fecha.getTime());

  if (lista.length === 0) {
    return (
      <div className="tarjeta p-5">
        <p className="text-sm text-tinta-2">
          No hay partidos abiertos{' '}
          {paraMiNivel || soloConLugar ? 'con esos filtros ' : ''}
          {radio ? `a menos de ${radio} km` : buscado ? 'con esa búsqueda' : 'por ahora'}. Armá el tuyo y
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
        titulo: `${p.deporte.nombre} · ${DIAS[diaDeLaSemana(p.fecha)]} ${p.fecha.toLocaleTimeString(
          'es-AR',
          { hour12: false, hour: '2-digit', minute: '2-digit', timeZone: 'America/Argentina/Buenos_Aires' }
        )}`,
        subtitulo: `${p.lugarNombre}${p.ciudad ? ` · ${p.ciudad}` : ''}`,
        url: `/partidos/${p.id}`,
        color: 'verde' as const,
      }));
    return (
      <>
        <Mapa puntos={puntos} centro={ubicacion} yo={ubicacion?.origen === 'dispositivo'} />
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
    <div className="flex flex-col gap-3 lg:grid lg:grid-cols-2">
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
                <span className="t-rotulo tabular">{rotuloDistancia(p.km, !p.canchaId)}</span>
              ) : null}
            </div>
            <p className="t-display text-[19px]">
              {DIAS[diaDeLaSemana(p.fecha)]} {hora}
            </p>
            <p className="text-[13px] text-tinta-2">
              {p.lugarNombre}
              {p.ciudad ? ` · ${p.ciudad}` : ''}
              {p.nivel ? (
                <span className="text-naranja-txt"> · Nivel {ROTULOS_NIVEL[p.nivel]?.toLowerCase()}</span>
              ) : null}
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
  deporteSlugs,
  q,
  usuario,
  vista,
  ubicacion,
  radio,
  soloTechadas,
  servicios,
  porPrecio,
}: {
  deporteSlugs?: string[] | null;
  q?: string;
  usuario: { tipoCuenta: string };
  vista?: string;
  ubicacion: Ubicacion | null;
  radio: number | null;
  soloTechadas: boolean;
  servicios: string[];
  porPrecio: boolean;
}) {
  const canchas = await prisma.cancha.findMany({
    where: {
      activa: true,
      ...(soloTechadas ? { techada: true } : {}),
      // Los servicios se guardan como lista JSON: cada uno tiene que estar.
      ...(servicios.length > 0 ? { AND: servicios.map((valor) => ({ servicios: { contains: `"${valor}"` } })) } : {}),
      // Solo publicaciones de dueños con la suscripción al día.
      dueno: { suscripcionHasta: { gt: new Date() } },
      ...(deporteSlugs ? { deporte: { slug: { in: deporteSlugs } } } : {}),
    },
    include: { deporte: true, dueno: { select: { verificacion: true } } },
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
    .map((c) => ({ ...c, km: kmHasta(ubicacion, c) }))
    .filter((c) => dentroDelRadio(c.km, radio))
    // Por precio (las sin precio, al final) o por cercanía; a igual precio, la más cerca.
    .sort((a, b) =>
      porPrecio
        ? (a.precioPorHora ?? Infinity) - (b.precioPorHora ?? Infinity) || (a.km ?? Infinity) - (b.km ?? Infinity)
        : (a.km ?? Infinity) - (b.km ?? Infinity)
    )
    .slice(0, 30);
  const puntajes = await puntajesDeCanchas(lista.map((c) => c.id));

  if (lista.length === 0) {
    return (
      <div className="tarjeta p-5">
        <p className="text-sm text-tinta-2">
          {radio
            ? `No hay canchas${soloTechadas || servicios.length > 0 ? ' así' : ''} publicadas a menos de ${radio} km. Probá con más distancia.`
            : soloTechadas || servicios.length > 0
              ? `No hay canchas con eso publicadas ${buscado ? 'con esa búsqueda' : 'por acá'}. Probá sacando algún filtro.`
              : `Todavía no hay canchas publicadas ${buscado ? 'con esa búsqueda' : 'por acá'}.`}
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
        <Mapa puntos={puntos} centro={ubicacion} yo={ubicacion?.origen === 'dispositivo'} />
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
    <div className="flex flex-col gap-3 lg:grid lg:grid-cols-2">
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
                <span className="t-rotulo text-verde-txt">
                  {c.deporte.nombre}
                  {c.techada ? ' · Techada' : ''}
                  {c.dueno.verificacion === 'VERIFICADA' ? (
                    <span className="ml-1.5 text-naranja-txt">✓</span>
                  ) : null}
                </span>
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
                {puntajes.get(c.id) ? (
                  <span className="ml-2 text-tinta-2">
                    ★ {formatearPuntaje(puntajes.get(c.id)!.promedio)} ({puntajes.get(c.id)!.cantidad})
                  </span>
                ) : null}
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
  deporteSlugs,
  soloCiudad,
}: {
  usuarioId: string;
  deporteSlugs?: string[] | null;
  soloCiudad?: string | null;
}) {
  const { filas, mia } = await calcularRanking(usuarioId, { deporteSlugs, soloCiudad });

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
  ubicacion,
  radio,
}: {
  q?: string;
  usuario: { id: string; ciudad: string | null };
  ubicacion: Ubicacion | null;
  radio: number | null;
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

  // Primero los más cerca (o los de tu ciudad); filtro de texto sin tildes.
  const lista = grupos
    .filter((grupo) =>
      !filtro
        ? true
        : normalizar(`${grupo.nombre} ${grupo.ciudad ?? ''} ${grupo.deporte.nombre}`).includes(filtro)
    )
    .map((grupo) => ({ ...grupo, km: kmHasta(ubicacion, grupo) }))
    .filter((grupo) => dentroDelRadio(grupo.km, radio))
    .sort((a, b) => {
      const aCerca = usuario.ciudad && a.ciudad === usuario.ciudad ? 0 : 1;
      const bCerca = usuario.ciudad && b.ciudad === usuario.ciudad ? 0 : 1;
      return (a.km ?? Infinity) - (b.km ?? Infinity) || aCerca - bCerca;
    })
    .slice(0, 25);

  if (lista.length === 0) {
    return (
      <div className="tarjeta p-5">
        <p className="text-sm text-tinta-2">
          No hay grupos abiertos{' '}
          {radio ? `a menos de ${radio} km` : filtro ? 'con esa búsqueda' : 'para sumarte por ahora'}. Armá el
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
          <LogoEquipo nombre={grupo.nombre} url={grupo.fotoUrl} tam={40} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{grupo.nombre}</p>
            <p className="t-rotulo mt-0.5">
              {grupo.deporte.nombre} · {grupo._count.miembros}{' '}
              {grupo._count.miembros === 1 ? 'miembro' : 'miembros'}
              {grupo.ciudad ? ` · ${grupo.ciudad}` : ''}
              {grupo.km != null ? ` · ${rotuloDistancia(grupo.km, true)}` : ''}
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

async function Jugadores({ q, miId, disponiblesAhora }: { q?: string; miId: string; disponiblesAhora: boolean }) {
  const filtro = q?.trim();
  const ocultos = await idsBloqueados(miId);
  const jugadores = await prisma.usuario.findMany({
    where: {
      id: { not: miId, notIn: ocultos },
      eliminadoEn: null,
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
    take: disponiblesAhora ? 200 : 25,
  });
  // "Pueden hoy a esta hora": solo los que lo marcaron (sin cargar, no se sabe).
  const ahora = new Date();
  const lista = disponiblesAhora
    ? jugadores.filter((j) => leerDisponibilidad(j.disponibilidad).length > 0 && puedeJugar(j.disponibilidad, ahora)).slice(0, 25)
    : jugadores;

  if (lista.length === 0) {
    return (
      <div className="tarjeta p-5">
        <p className="text-sm text-tinta-2">
          {disponiblesAhora
            ? 'Nadie marcó que puede jugar ahora. Cada uno lo carga en Perfil → Mis deportes.'
            : 'No encontramos jugadores con esa búsqueda.'}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {lista.map((jugador) => (
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
