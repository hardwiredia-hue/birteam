import type { Franja } from '@/lib/ocupacion';

const DIAS = [
  { dia: 1, corto: 'L', largo: 'Lunes' },
  { dia: 2, corto: 'M', largo: 'Martes' },
  { dia: 3, corto: 'M', largo: 'Miércoles' },
  { dia: 4, corto: 'J', largo: 'Jueves' },
  { dia: 5, corto: 'V', largo: 'Viernes' },
  { dia: 6, corto: 'S', largo: 'Sábado' },
  { dia: 0, corto: 'D', largo: 'Domingo' },
];
const NOMBRE_DIA = Object.fromEntries(DIAS.map((d) => [d.dia, d.largo]));

/** Escala de un solo tono (el verde de la marca sobre el panel): más fuerte = más tomado. */
const PASOS = [10, 28, 48, 72, 100];
function tono(tasa: number) {
  const paso = tasa === 0 ? 0 : tasa <= 0.25 ? 1 : tasa <= 0.5 ? 2 : tasa <= 0.75 ? 3 : 4;
  return `color-mix(in srgb, var(--verde-txt) ${PASOS[paso]}%, var(--panel))`;
}

const porcentaje = (f: Franja) => Math.round((f.tomados / f.ofrecidos) * 100);
const rotulo = (f: Franja) => `${NOMBRE_DIA[f.dia]} ${String(f.hora).padStart(2, '0')} h`;

/**
 * Mapa de ocupación de las últimas semanas: días en columnas, horas en
 * filas. Cada celda dice qué parte de los turnos de esa franja se tomó.
 */
export function MapaOcupacion({
  horas,
  franja,
  semanas,
  ofrecidos,
  tomados,
  masPedidas,
  masFlojas,
}: {
  horas: number[];
  franja: (dia: number, hora: number) => Franja | null;
  semanas: number;
  ofrecidos: number;
  tomados: number;
  masPedidas: Franja[];
  masFlojas: Franja[];
}) {
  if (ofrecidos === 0) return null;

  return (
    <section className="tarjeta flex flex-col gap-4 p-4">
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">Qué horarios se llenan</p>
          <p className="text-xs text-tinta-3">
            Últimas {semanas} semanas, todas tus canchas · {Math.round((tomados / ofrecidos) * 100)}% de los turnos
            tomados
          </p>
        </div>
      </div>

      {tomados === 0 ? (
        <p className="text-xs text-tinta-2">
          Todavía no hay turnos tomados en este período. Cuando empiecen a reservar, acá vas a ver qué
          horarios se llenan y cuáles quedan vacíos.
        </p>
      ) : (
        <>
          <div
            className="grid gap-[3px]"
            style={{ gridTemplateColumns: `2.25rem repeat(7, minmax(0, 1fr))` }}
            role="table"
            aria-label="Ocupación por día y hora"
          >
            <span role="columnheader" />
            {DIAS.map((d) => (
              <span key={d.dia} role="columnheader" aria-label={d.largo} className="t-rotulo pb-1 text-center text-[10px]">
                {d.corto}
              </span>
            ))}
            {horas.map((hora) => (
              <div key={hora} role="row" className="contents">
                <span role="rowheader" className="t-rotulo flex items-center text-[10px] tabular">
                  {String(hora).padStart(2, '0')}
                </span>
                {DIAS.map((d) => {
                  const f = franja(d.dia, hora);
                  if (!f) {
                    return <span key={d.dia} role="cell" aria-label={`${d.largo} ${hora} h: no abre`} className="h-6" />;
                  }
                  const texto = `${rotulo(f)}: ${f.tomados} de ${f.ofrecidos} turnos tomados (${porcentaje(f)}%)`;
                  return (
                    <span
                      key={d.dia}
                      role="cell"
                      title={texto}
                      aria-label={texto}
                      className="h-6 rounded-[4px] transition-[outline] hover:outline hover:outline-2 hover:outline-offset-1 hover:outline-tinta-3"
                      style={{ background: tono(f.tomados / f.ofrecidos) }}
                    />
                  );
                })}
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2 text-[11px] text-tinta-3" aria-hidden>
            <span>Vacío</span>
            {PASOS.map((paso) => (
              <span
                key={paso}
                className="h-3 w-5 rounded-[3px]"
                style={{ background: `color-mix(in srgb, var(--verde-txt) ${paso}%, var(--panel))` }}
              />
            ))}
            <span>Lleno</span>
            <span className="ml-auto">En blanco: no abre</span>
          </div>

          <div className="flex flex-col gap-1.5 border-t border-borde pt-3 text-xs">
            {masPedidas.length > 0 ? (
              <p className="text-tinta-2">
                <span className="font-semibold text-tinta">Se llenan:</span>{' '}
                {masPedidas.map((f) => `${rotulo(f)} (${porcentaje(f)}%)`).join(' · ')}
                {masPedidas.some((f) => porcentaje(f) >= 75) ? '. Ahí podés cobrar precio pico.' : '.'}
              </p>
            ) : null}
            {masFlojas.length > 0 ? (
              <p className="text-tinta-2">
                <span className="font-semibold text-tinta">Quedan vacíos:</span>{' '}
                {masFlojas.map((f) => `${rotulo(f)} (${porcentaje(f)}%)`).join(' · ')}. Publicalos en el Radar
                con descuento o armá un turno fijo.
              </p>
            ) : null}
          </div>
        </>
      )}
    </section>
  );
}
