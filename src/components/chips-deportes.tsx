import Link from 'next/link';
import { agruparDeportes, seleccionDelFiltro, type DeporteBasico } from '@/lib/deportes';
import { IconoDeporte } from '@/components/icono-deporte';

/**
 * Fila de filtros por deporte: una chip por familia (Fútbol junta 5, 7 y 11)
 * con su ícono. Si la familia elegida tiene varias modalidades, abajo
 * aparece "¿Qué tipo?" para afinar (Fútbol 7, Básquet 3x3…).
 * El valor de la URL es la clave de la familia o el de la modalidad.
 */
export function ChipsDeportes({
  deportes,
  activo,
  href,
  conTodos = true,
  envolver = false,
}: {
  deportes: DeporteBasico[];
  /** Valor actual del filtro (clave de familia, modalidad o slug viejo). */
  activo?: string | null;
  href: (valor: string | null) => string;
  conTodos?: boolean;
  /** true: varias filas; false: una fila con scroll horizontal; 'contenido': se suma a la fila de afuera. */
  envolver?: boolean | 'contenido';
}) {
  const familias = agruparDeportes(deportes);
  const { familia: actual, modalidad } = seleccionDelFiltro(activo, deportes);
  const elegida = familias.find((f) => f.clave === actual);
  const clase = (on: boolean) => `${on ? 'chip-sel chip-sel-activo' : 'chip-sel'} shrink-0 inline-flex items-center gap-1.5`;
  return (
    <>
      <div
        className={
          envolver === 'contenido' ? 'contents' : envolver ? 'flex flex-wrap gap-2' : 'fila-chips'
        }
      >
        {conTodos ? (
          <Link href={href(null)} className={clase(!actual)}>
            Todos
          </Link>
        ) : null}
        {familias.map((familia) => (
          <Link
            key={familia.clave}
            href={actual === familia.clave && !conTodos ? href(null) : href(familia.clave)}
            className={clase(actual === familia.clave)}
          >
            <IconoDeporte icono={familia.icono} />
            {familia.nombre}
          </Link>
        ))}
      </div>
      {elegida && elegida.opciones.length > 1 ? (
        <div className="flex basis-full flex-wrap items-center gap-2">
          <span className="t-rotulo">¿Qué tipo?</span>
          <Link href={href(elegida.clave)} className={clase(!modalidad)}>
            Todos
          </Link>
          {elegida.opciones.map((opcion) => (
            <Link key={opcion.id} href={href(opcion.filtro)} className={clase(modalidad === opcion.filtro)}>
              {opcion.modalidad}
            </Link>
          ))}
        </div>
      ) : null}
    </>
  );
}
