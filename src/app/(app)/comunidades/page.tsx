import Link from 'next/link';
import { prisma } from '@/lib/db';
import { agruparDeportes } from '@/lib/deportes';
import { IconoDeporte } from '@/components/icono-deporte';

export const metadata = { title: 'Comunidades' };
export const dynamic = 'force-dynamic';

export default async function Comunidades() {
  const [deportes, jugadoresPor, partidosPor] = await Promise.all([
    prisma.deporte.findMany({ orderBy: { orden: 'asc' } }),
    prisma.usuarioDeporte.groupBy({ by: ['deporteId'], _count: { _all: true } }),
    prisma.partido.groupBy({
      by: ['deporteId'],
      where: { visibilidad: 'ABIERTO', estado: { in: ['ARMANDOSE', 'CONFIRMADO'] }, fecha: { gte: new Date() } },
      _count: { _all: true },
    }),
  ]);

  const jugadores = new Map(jugadoresPor.map((fila) => [fila.deporteId, fila._count._all]));
  const partidos = new Map(partidosPor.map((fila) => [fila.deporteId, fila._count._all]));
  const suma = (mapa: Map<string, number>, ids: string[]) => ids.reduce((total, id) => total + (mapa.get(id) ?? 0), 0);
  const familias = agruparDeportes(deportes);
  const cuenta = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;

  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="t-pantalla">Comunidades</h1>
        <p className="mt-1 text-sm text-tinta-2">
          Cada deporte tiene su casa: partidos abiertos, grupos y ranking en un solo lugar.
        </p>
      </header>

      <div className="flex flex-col gap-2">
        {familias.map((familia) => {
          const ids = familia.opciones.map((o) => o.id);
          const resumen = (
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-full border border-borde bg-fondo text-verde-txt">
                <IconoDeporte icono={familia.icono} tam={22} />
              </span>
              <div className="min-w-0">
                <p className="t-display text-[17px]">{familia.nombre}</p>
                <p className="t-rotulo mt-0.5 tabular">
                  {cuenta(suma(jugadores, ids), 'jugador', 'jugadores')} ·{' '}
                  {cuenta(suma(partidos, ids), 'partido abierto', 'partidos abiertos')}
                </p>
              </div>
            </div>
          );
          if (familia.opciones.length === 1) {
            return (
              <Link
                key={familia.clave}
                href={`/comunidades/${familia.opciones[0].slug}`}
                className="tarjeta flex items-center justify-between gap-3 p-4"
              >
                {resumen}
                <span className="t-display text-[16px] text-verde-txt">→</span>
              </Link>
            );
          }
          // Varias modalidades: se elige el tipo para entrar a su comunidad.
          return (
            <div key={familia.clave} className="tarjeta flex flex-col gap-3 p-4">
              {resumen}
              <div className="flex flex-wrap items-center gap-2">
                <span className="t-rotulo">¿Qué tipo?</span>
                {familia.opciones.map((opcion) => (
                  <Link key={opcion.id} href={`/comunidades/${opcion.slug}`} className="chip-sel">
                    {opcion.modalidad}
                    <span className="ml-1 text-tinta-3 tabular">{jugadores.get(opcion.id) ?? 0}</span>
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
