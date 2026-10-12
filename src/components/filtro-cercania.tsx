import Link from 'next/link';
import { RADIOS_KM, type Ubicacion } from '@/lib/ubicacion';
import { UbicacionActual } from '@/components/ubicacion-actual';

/**
 * Cercanía: desde dónde se mide (celular o ciudad) y hasta cuántos km.
 * Sin radio elegido se ve todo, lo más cerca primero.
 */
export function FiltroCercania({
  ubicacion,
  ciudad,
  radio,
  href,
}: {
  ubicacion: Ubicacion | null;
  ciudad: string | null;
  radio: number | null;
  href: (radio: number | null) => string;
}) {
  return (
    <div className="flex flex-col gap-2.5">
      <UbicacionActual origen={ubicacion?.origen ?? null} ciudad={ciudad} />
      {ubicacion ? (
        <div className="flex flex-wrap gap-2" role="group" aria-label="Distancia máxima">
          <Link href={href(null)} className={radio == null ? 'chip-sel chip-sel-activo' : 'chip-sel'}>
            Sin límite
          </Link>
          {RADIOS_KM.map((km) => (
            <Link
              key={km}
              href={href(km)}
              className={radio === km ? 'chip-sel chip-sel-activo' : 'chip-sel'}
            >
              {km} km
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
