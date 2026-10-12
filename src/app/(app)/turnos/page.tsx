import { EnlaceAyuda } from '@/components/ayuda';
import Link from 'next/link';
import { prisma } from '@/lib/db';
import { usuarioActual } from '@/lib/auth';
import { formatearPlata } from '@/lib/formato';
import { formatearDistancia } from '@/lib/geo';
import { infoDeporte, nombreDelFiltro, slugsDelFiltro } from '@/lib/deportes';
import { ChipsDeportes } from '@/components/chips-deportes';
import { ZONA, buscarTurnosLibres, proximosDias, rotuloDia } from '@/lib/reservas';

export const metadata = { title: 'Buscar turno' };
export const dynamic = 'force-dynamic';

/** Franjas para elegir la hora sin tipear (minutos del día, inicio del turno). */
const FRANJAS: { clave: string; rotulo: string; desde: number; hasta: number; cerca?: number }[] = [
  { clave: 'manana', rotulo: 'De mañana', desde: 6 * 60, hasta: 12 * 60 },
  { clave: 'tarde', rotulo: 'De tarde', desde: 12 * 60, hasta: 18 * 60 },
  ...[18, 19, 20, 21, 22, 23].map((hora) => ({
    clave: String(hora),
    rotulo: `${hora} h`,
    // Lo pedido y hasta una hora antes o después, lo más pegado primero.
    desde: (hora - 1) * 60,
    hasta: (hora + 1) * 60 + 1,
    cerca: hora * 60,
  })),
];

/**
 * Buscar turno en todas las canchas a la vez: deporte, día y hora, y las
 * canchas con ese turno libre ahora mismo. Tocar un horario abre la grilla
 * de la cancha con el turno elegido para pedirlo.
 */
export default async function BuscarTurno({
  searchParams,
}: {
  searchParams: Promise<{ deporte?: string; dia?: string; hora?: string }>;
}) {
  const params = await searchParams;
  const usuario = (await usuarioActual())!;

  const [deportes, principal] = await Promise.all([
    prisma.deporte.findMany({ orderBy: { orden: 'asc' }, select: { id: true, nombre: true, slug: true } }),
    prisma.usuarioDeporte.findFirst({
      where: { usuarioId: usuario.id },
      orderBy: { principal: 'desc' },
      include: { deporte: { select: { nombre: true, slug: true } } },
    }),
  ]);

  // Sin elegir: el deporte del perfil (su familia: Fútbol trae 5, 7 y 11).
  const deporte = params.deporte ?? (principal ? infoDeporte(principal.deporte).clave : undefined);
  const slugs = deporte === 'todos' ? null : slugsDelFiltro(deporte, deportes);
  const deporteIds = slugs ? deportes.filter((d) => slugs.includes(d.slug)).map((d) => d.id) : null;

  const dias = proximosDias(7);
  // De noche ya no queda nada para hoy: arranca por mañana.
  const horaActual = Number(new Date().toLocaleTimeString('en-GB', { hour: '2-digit', timeZone: ZONA }).slice(0, 2));
  const dia = params.dia && dias.includes(params.dia) ? params.dia : horaActual >= 22 ? dias[1] : dias[0];
  const franja = FRANJAS.find((f) => f.clave === params.hora) ?? null;

  const resultados = await buscarTurnosLibres({
    deporteIds,
    fecha: dia,
    desde: franja?.desde,
    hasta: franja?.hasta,
    cerca: franja?.cerca,
    ciudad: usuario.ciudad,
    ubicacion:
      usuario.latitud != null && usuario.longitud != null
        ? { latitud: usuario.latitud, longitud: usuario.longitud }
        : null,
  });

  const actuales = { deporte, dia, hora: franja?.clave };
  const enlace = (cambios: Partial<Record<'deporte' | 'dia' | 'hora', string | null>>) => {
    const parametros = new URLSearchParams();
    for (const clave of ['deporte', 'dia', 'hora'] as const) {
      const valor = clave in cambios ? cambios[clave] : actuales[clave];
      if (valor) parametros.set(clave, valor);
    }
    // "Todos los deportes" se marca explícito para no volver al del perfil.
    if (cambios.deporte === null) parametros.set('deporte', 'todos');
    return `/turnos?${parametros.toString()}`;
  };
  const nombreDeporte = deporte === 'todos' ? null : nombreDelFiltro(deporte, deportes);
  const rotuloDelDia = (fecha: string) => (fecha === dias[0] ? 'Hoy' : fecha === dias[1] ? 'Mañana' : rotuloDia(fecha));

  return (
    <div className="flex flex-col gap-5">
      <header>
        <h1 className="t-pantalla">Buscar turno</h1>
        <p className="mt-1 text-sm text-tinta-2">
          Elegí deporte, día y hora: te mostramos las canchas que lo tienen libre ahora.
        </p>
        <EnlaceAyuda tema="canchas-y-turnos" articulo="buscar-turno" className="mt-2" />
      </header>

      <ChipsDeportes
        deportes={deportes}
        activo={deporte === 'todos' ? null : deporte}
        href={(valor) => enlace({ deporte: valor })}
      />

      <div className="flex flex-col gap-2">
        <span className="rotulo-campo">Día</span>
        <div className="fila-chips">
          {dias.map((fecha) => (
            <Link
              key={fecha}
              href={enlace({ dia: fecha })}
              className={fecha === dia ? 'chip-sel chip-sel-activo shrink-0' : 'chip-sel shrink-0'}
            >
              {rotuloDelDia(fecha)}
            </Link>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span className="rotulo-campo">Hora</span>
        <div className="flex flex-wrap gap-2">
          <Link href={enlace({ hora: null })} className={!franja ? 'chip-sel chip-sel-activo' : 'chip-sel'}>
            Cualquiera
          </Link>
          {FRANJAS.map((f) => (
            <Link
              key={f.clave}
              href={enlace({ hora: f.clave })}
              className={franja?.clave === f.clave ? 'chip-sel chip-sel-activo' : 'chip-sel'}
            >
              {f.rotulo}
            </Link>
          ))}
        </div>
      </div>

      <section className="flex flex-col gap-3">
        <p className="t-rotulo">
          {resultados.length === 0
            ? 'Sin turnos libres'
            : `${resultados.length} ${resultados.length === 1 ? 'cancha' : 'canchas'} con turno · ${rotuloDelDia(dia)}`}
        </p>
        {resultados.length === 0 ? (
          <div className="tarjeta flex flex-col gap-3 p-5">
            <p className="text-sm text-tinta-2">
              No encontramos turnos libres{nombreDeporte ? ` de ${nombreDeporte}` : ''} {rotuloDelDia(dia).toLowerCase()}
              {franja ? ` cerca de esa hora` : ''}. Probá otro día u horario, o fijate el Radar.
            </p>
            <Link href="/radar" className="btn btn-secundario btn-sm self-start">
              Ver el Radar
            </Link>
          </div>
        ) : (
          resultados.map((cancha) => (
            <article key={cancha.canchaId} className="tarjeta flex flex-col gap-3 p-4">
              <Link href={`/canchas/${cancha.canchaId}?fecha=${dia}`} className="flex items-start justify-between gap-3">
                <span className="min-w-0">
                  <span className="t-rotulo block text-verde-txt">{cancha.deporte}</span>
                  <span className="mt-0.5 block truncate text-[15px] font-semibold">{cancha.canchaNombre}</span>
                  <span className="block truncate text-xs text-tinta-3">
                    {cancha.direccion}
                    {cancha.ciudad ? ` · ${cancha.ciudad}` : ''}
                  </span>
                </span>
                {cancha.km != null ? (
                  <span className="shrink-0 text-xs font-semibold text-tinta-2">{formatearDistancia(cancha.km)}</span>
                ) : null}
              </Link>
              <div className="flex flex-wrap gap-2">
                {cancha.turnos.map((turno) => (
                  <Link
                    key={turno.hora}
                    href={`/canchas/${cancha.canchaId}?fecha=${dia}&hora=${turno.hora}`}
                    className="flex flex-col items-center rounded-[6px] border px-3 py-1.5"
                    style={{
                      borderColor: turno.descuento ? 'var(--naranja-txt)' : 'var(--verde-txt)',
                      color: turno.descuento ? 'var(--naranja-txt)' : 'var(--verde-txt)',
                    }}
                  >
                    <span className="text-[15px] font-bold tabular">{turno.hora}</span>
                    <span className="text-[10.5px] font-semibold tabular">
                      {turno.descuento ? `−${turno.descuento}% · ` : ''}
                      {turno.precio != null ? formatearPlata(turno.precio) : 'Consultar'}
                    </span>
                  </Link>
                ))}
              </div>
            </article>
          ))
        )}
      </section>
    </div>
  );
}
