import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { usuarioActual } from '@/lib/auth';
import { calcularTabla } from '@/lib/torneos';
import {
  AnotarEquipo,
  ArrancarTorneo,
  CargarResultado,
  CompartirTorneo,
  TerminarTorneo,
} from './acciones';

export const metadata = { title: 'Torneo' };
export const dynamic = 'force-dynamic';

export default async function PaginaTorneo({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const usuario = (await usuarioActual())!;

  const torneo = await prisma.torneo.findUnique({
    where: { id },
    include: {
      deporte: true,
      organizador: { select: { nombre: true, usuario: true } },
      equipos: {
        include: { capitan: { select: { nombre: true, usuario: true } } },
        orderBy: { creadoEn: 'asc' },
      },
      partidos: { orderBy: [{ ronda: 'asc' }] },
    },
  });
  if (!torneo) notFound();

  const organizo = torneo.organizadorId === usuario.id;
  const miEquipo = torneo.equipos.find((equipo) => equipo.capitanId === usuario.id);
  const nombrePorId = new Map(torneo.equipos.map((equipo) => [equipo.id, equipo.nombre]));
  const tabla = calcularTabla(torneo.equipos, torneo.partidos);
  const pendientes = torneo.partidos.filter((partido) => partido.golesLocal === null).length;
  const campeon = torneo.estado === 'TERMINADO' ? tabla[0] : null;

  const rondas = [...new Set(torneo.partidos.map((partido) => partido.ronda))];

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1.5">
        <p className="t-rotulo text-verde-txt">
          {torneo.deporte.nombre} ·{' '}
          {torneo.estado === 'INSCRIPCION'
            ? 'inscripción abierta'
            : torneo.estado === 'EN_JUEGO'
              ? 'en juego'
              : 'terminado'}
        </p>
        <h1 className="t-display text-[28px]">{torneo.nombre}</h1>
        {torneo.descripcion ? <p className="text-sm text-tinta-2">{torneo.descripcion}</p> : null}
        <p className="text-[13px] text-tinta-3">
          Organiza {torneo.organizador.nombre} (@{torneo.organizador.usuario})
          {torneo.ciudad ? ` · ${torneo.ciudad}` : ''}
        </p>
      </header>

      {campeon ? (
        <div className="tarjeta p-5 text-center" style={{ borderColor: 'var(--verde)' }}>
          <p className="t-rotulo text-verde-txt">Campeón</p>
          <p className="t-display mt-1 text-[30px]">{campeon.nombre}</p>
          <p className="t-rotulo mt-1 tabular">
            {campeon.puntos} puntos · {campeon.pg}G {campeon.pe}E {campeon.pp}P
          </p>
        </div>
      ) : null}

      {torneo.estado === 'INSCRIPCION' ? (
        <section className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between">
            <p className="t-rotulo tabular">
              Equipos · {torneo.equipos.length}/{torneo.maxEquipos}
            </p>
          </div>
          {torneo.equipos.length === 0 ? (
            <p className="tarjeta p-4 text-sm text-tinta-2">
              Todavía no hay equipos. Compartí el torneo con los capitanes y que se anoten.
            </p>
          ) : (
            <div>
              {torneo.equipos.map((equipo) => (
                <div key={equipo.id} className="flex items-baseline justify-between gap-3 border-b border-borde py-2.5 last:border-b-0">
                  <span className="text-sm font-semibold">{equipo.nombre}</span>
                  <span className="text-xs text-tinta-3">capitán @{equipo.capitan.usuario}</span>
                </div>
              ))}
            </div>
          )}
          {!miEquipo && torneo.equipos.length < torneo.maxEquipos ? (
            <AnotarEquipo torneoId={torneo.id} />
          ) : miEquipo ? (
            <p className="aviso-ok">Tu equipo {miEquipo.nombre} está anotado.</p>
          ) : (
            <p className="aviso-ok border-azul-txt text-azul-txt">Cupo completo.</p>
          )}
          {torneo.tokenPublico ? (
            <CompartirTorneo rutaPublica={`/t/${torneo.tokenPublico}`} />
          ) : null}
          <Link href={`/jugadas?compartir=torneo:${torneo.id}`} className="btn btn-fantasma">
            Compartir en Jugadas
          </Link>
          {organizo ? (
            <ArrancarTorneo torneoId={torneo.id} equipos={torneo.equipos.length} />
          ) : null}
        </section>
      ) : (
        <>
          <section>
            <p className="t-rotulo mb-2">Tabla de posiciones</p>
            <div className="tarjeta overflow-x-auto p-2">
              <table className="w-full text-sm">
                <thead>
                  <tr className="t-rotulo text-left">
                    <th className="px-2 py-1.5">#</th>
                    <th className="px-2 py-1.5">Equipo</th>
                    <th className="px-2 py-1.5 text-center">PJ</th>
                    <th className="px-2 py-1.5 text-center">G</th>
                    <th className="px-2 py-1.5 text-center">E</th>
                    <th className="px-2 py-1.5 text-center">P</th>
                    <th className="px-2 py-1.5 text-center">GF</th>
                    <th className="px-2 py-1.5 text-center">GC</th>
                    <th className="px-2 py-1.5 text-center">DIF</th>
                    <th className="px-2 py-1.5 text-center">PTS</th>
                  </tr>
                </thead>
                <tbody className="tabular">
                  {tabla.map((fila, indice) => (
                    <tr
                      key={fila.equipoId}
                      className="border-t border-borde"
                      style={
                        fila.equipoId === miEquipo?.id ? { background: 'rgba(168,230,23,0.06)' } : undefined
                      }
                    >
                      <td className="px-2 py-1.5 t-rotulo" style={{ color: indice < 1 ? 'var(--verde-txt)' : undefined }}>
                        {indice + 1}
                      </td>
                      <td className="px-2 py-1.5 font-semibold">{fila.nombre}</td>
                      <td className="px-2 py-1.5 text-center">{fila.pj}</td>
                      <td className="px-2 py-1.5 text-center">{fila.pg}</td>
                      <td className="px-2 py-1.5 text-center">{fila.pe}</td>
                      <td className="px-2 py-1.5 text-center">{fila.pp}</td>
                      <td className="px-2 py-1.5 text-center">{fila.gf}</td>
                      <td className="px-2 py-1.5 text-center">{fila.gc}</td>
                      <td className="px-2 py-1.5 text-center">{fila.dif > 0 ? `+${fila.dif}` : fila.dif}</td>
                      <td className="px-2 py-1.5 text-center font-bold" style={{ color: 'var(--verde-txt)' }}>
                        {fila.puntos}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="flex flex-col gap-4">
            <p className="t-rotulo">Fixture</p>
            {rondas.map((ronda) => (
              <div key={ronda}>
                <p className="t-rotulo mb-1 text-verde-txt">Fecha {ronda}</p>
                <div className="flex flex-col gap-1.5">
                  {torneo.partidos
                    .filter((partido) => partido.ronda === ronda)
                    .map((partido) => (
                      <div key={partido.id} className="tarjeta flex items-center gap-2 p-3">
                        <span className="min-w-0 flex-1 truncate text-right text-sm font-semibold">
                          {nombrePorId.get(partido.localId)}
                        </span>
                        {partido.golesLocal !== null ? (
                          <span className="t-display flex-shrink-0 px-1 text-[16px] tabular">
                            {partido.golesLocal}–{partido.golesVisitante}
                          </span>
                        ) : organizo && torneo.estado === 'EN_JUEGO' ? (
                          <CargarResultado torneoId={torneo.id} partidoTorneoId={partido.id} />
                        ) : (
                          <span className="t-rotulo flex-shrink-0 px-1">vs</span>
                        )}
                        <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                          {nombrePorId.get(partido.visitanteId)}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </section>

          {organizo && torneo.estado === 'EN_JUEGO' ? (
            <TerminarTorneo torneoId={torneo.id} pendientes={pendientes} />
          ) : null}
        </>
      )}
    </div>
  );
}
