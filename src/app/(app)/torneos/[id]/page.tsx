import Link from 'next/link';
import { LogoEquipo } from '@/components/logo-equipo';
import { SubirLogo } from '@/components/subir-logo';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { usuarioActual } from '@/lib/auth';
import { avanzarCopa, calcularTabla, nombreRonda, rondasDeCopa } from '@/lib/torneos';
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
  const logoPorId = new Map(torneo.equipos.map((equipo) => [equipo.id, equipo.logoUrl]));
  const logo = (equipoId: string, tam: number) => (
    <LogoEquipo nombre={nombrePorId.get(equipoId) ?? ''} url={logoPorId.get(equipoId)} tam={tam} />
  );
  const tabla = calcularTabla(torneo.equipos, torneo.partidos);
  const pendientes = torneo.partidos.filter((partido) => partido.golesLocal === null).length;
  const esCopa = torneo.formato === 'COPA';
  const cuadro: (string | null)[] = esCopa && torneo.cuadro ? JSON.parse(torneo.cuadro) : [];
  const totalRondas = esCopa ? rondasDeCopa(cuadro) : 0;
  // Liga: el primero de la tabla. Copa: el ganador de la final.
  const campeonLiga = !esCopa && torneo.estado === 'TERMINADO' ? tabla[0] : null;
  const campeonCopaId = esCopa && cuadro.length > 0 ? avanzarCopa(cuadro, torneo.partidos).campeonId : null;
  const campeon = campeonLiga ?? (campeonCopaId ? { nombre: nombrePorId.get(campeonCopaId) ?? '' } : null);

  const rondas = [...new Set(torneo.partidos.map((partido) => partido.ronda))];

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1.5">
        <p className="t-rotulo text-verde-txt">
          {torneo.deporte.nombre} ·{' '}
          {esCopa ? 'copa · ' : 'liga · '}
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
          {campeonLiga ? (
            <p className="t-rotulo mt-1 tabular">
              {campeonLiga.puntos} puntos · {campeonLiga.pg}G {campeonLiga.pe}E {campeonLiga.pp}P
            </p>
          ) : (
            <p className="t-rotulo mt-1">Ganó la final</p>
          )}
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
                <div key={equipo.id} className="flex items-center justify-between gap-3 border-b border-borde py-2.5 last:border-b-0">
                  <span className="flex min-w-0 items-center gap-2.5">
                    {logo(equipo.id, 28)}
                    <span className="truncate text-sm font-semibold">{equipo.nombre}</span>
                  </span>
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
          {organizo ? (
            <ArrancarTorneo torneoId={torneo.id} equipos={torneo.equipos.length} formato={torneo.formato} />
          ) : null}
        </section>
      ) : (
        <>
          {!esCopa ? (
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
                      <td className="px-2 py-1.5 font-semibold">
                        <span className="flex items-center gap-2">
                          {logo(fila.equipoId, 20)}
                          {fila.nombre}
                        </span>
                      </td>
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
          ) : null}

          <section className="flex flex-col gap-4">
            <p className="t-rotulo">{esCopa ? 'Cuadro' : 'Fixture'}</p>
            {rondas.map((ronda) => (
              <div key={ronda}>
                <p className="t-rotulo mb-1 text-verde-txt">
                  {esCopa ? nombreRonda(ronda, totalRondas) : `Fecha ${ronda}`}
                </p>
                <div className="flex flex-col gap-1.5">
                  {torneo.partidos
                    .filter((partido) => partido.ronda === ronda)
                    .map((partido) => (
                      <div key={partido.id} className="tarjeta flex items-center gap-2 p-3">
                        <span className="flex min-w-0 flex-1 items-center justify-end gap-2 text-right text-sm font-semibold">
                          <span className="truncate">{nombrePorId.get(partido.localId)}</span>
                          {logo(partido.localId, 22)}
                        </span>
                        {partido.golesLocal !== null ? (
                          <span className="flex flex-shrink-0 flex-col items-center px-1">
                            <span className="t-display text-[16px] tabular">
                              {partido.golesLocal}–{partido.golesVisitante}
                            </span>
                            {partido.penalesLocal != null ? (
                              <span className="t-rotulo text-[9.5px] tabular">
                                pen. {partido.penalesLocal}–{partido.penalesVisitante}
                              </span>
                            ) : null}
                          </span>
                        ) : organizo && torneo.estado === 'EN_JUEGO' ? (
                          <CargarResultado torneoId={torneo.id} partidoTorneoId={partido.id} copa={esCopa} />
                        ) : (
                          <span className="t-rotulo flex-shrink-0 px-1">vs</span>
                        )}
                        <span className="flex min-w-0 flex-1 items-center gap-2 text-sm font-semibold">
                          {logo(partido.visitanteId, 22)}
                          <span className="truncate">{nombrePorId.get(partido.visitanteId)}</span>
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </section>

          {organizo && torneo.estado === 'EN_JUEGO' && !esCopa ? (
            <TerminarTorneo torneoId={torneo.id} pendientes={pendientes} />
          ) : null}
        </>
      )}

      {miEquipo && torneo.estado !== 'TERMINADO' ? (
        <section className="tarjeta flex flex-col gap-3 p-4">
          <div>
            <p className="text-sm font-semibold">Logo de {miEquipo.nombre}</p>
            <p className="text-xs text-tinta-3">Se ve en la tabla, el fixture y la página pública del torneo.</p>
          </div>
          <SubirLogo
            endpoint={`/api/torneos/${torneo.id}/equipos/${miEquipo.id}/logo`}
            nombre={miEquipo.nombre}
            url={miEquipo.logoUrl}
          />
        </section>
      ) : null}

      <Link href={`/birtsocial?compartir=torneo:${torneo.id}`} className="btn btn-fantasma">
        Compartir en BirtSocial
      </Link>
    </div>
  );
}
