import type { Semana } from '@/lib/tendencia';

/**
 * Barras semana a semana de una sola medida: alto proporcional, la última
 * semana con su número escrito, el resto a la vista al pasar el dedo o el
 * mouse. Debajo, la misma información como tabla para lectores de pantalla.
 */
export function Tendencia({ titulo, semanas }: { titulo: string; semanas: Semana[] }) {
  const maximo = Math.max(1, ...semanas.map((s) => s.valor));
  const ultima = semanas[semanas.length - 1];
  const anterior = semanas[semanas.length - 2];
  const cambio = ultima && anterior ? ultima.valor - anterior.valor : 0;

  return (
    <figure className="tarjeta flex flex-col gap-3 p-4">
      <figcaption className="flex flex-col gap-0.5">
        <span className="t-rotulo">{titulo}</span>
        <span className="text-xs text-tinta-3 tabular">
          {cambio === 0 ? 'igual que la anterior' : `${cambio > 0 ? '+' : ''}${cambio} vs. la anterior`}
        </span>
      </figcaption>
      {/* Arriba queda lugar para el número de la última semana y el dato al pasar. */}
      <div className="flex h-24 gap-[2px] pt-6" aria-hidden>
        {semanas.map((semana, i) => {
          const esUltima = i === semanas.length - 1;
          const alto = Math.max(2, (semana.valor / maximo) * 100);
          return (
            <div key={semana.desde} className="group relative h-full flex-1">
              <div
                className="absolute bottom-0 left-1/2 w-full max-w-[22px] -translate-x-1/2 rounded-t-[4px]"
                style={{
                  height: `${alto}%`,
                  background: semana.valor > 0 ? 'var(--verde-txt)' : 'var(--borde)',
                  opacity: esUltima ? 1 : 0.55,
                }}
              />
              {esUltima ? (
                <span
                  className="absolute left-1/2 -translate-x-1/2 text-[13px] font-semibold text-tinta tabular group-hover:invisible"
                  style={{ bottom: `calc(${alto}% + 4px)` }}
                >
                  {semana.valor}
                </span>
              ) : null}
              <span
                className="pointer-events-none absolute left-1/2 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded-[4px] border border-borde bg-panel px-2 py-0.5 text-[11px] text-tinta group-hover:block tabular"
                style={{ bottom: `calc(${alto}% + 4px)` }}
              >
                {semana.desde}: {semana.valor}
              </span>
            </div>
          );
        })}
      </div>
      <div className="flex justify-between text-[10px] text-tinta-3" aria-hidden>
        <span>{semanas[0]?.desde}</span>
        <span>esta semana</span>
      </div>
      <table className="sr-only">
        <caption>{titulo}, por semana</caption>
        <thead>
          <tr>
            <th scope="col">Semana desde</th>
            <th scope="col">Cantidad</th>
          </tr>
        </thead>
        <tbody>
          {semanas.map((semana) => (
            <tr key={semana.desde}>
              <td>{semana.desde}</td>
              <td>{semana.valor}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
