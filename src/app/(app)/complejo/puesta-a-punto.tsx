import Link from 'next/link';
import type { Paso } from '@/lib/puesta-a-punto';

/** "Tu complejo al 60%": los pasos que faltan, cada uno con su atajo. */
export function PuestaAPunto({ pasos }: { pasos: Paso[] }) {
  const hechos = pasos.filter((p) => p.hecho).length;
  if (hechos === pasos.length) return null;
  const porcentaje = Math.round((hechos / pasos.length) * 100);
  const pendientes = pasos.filter((p) => !p.hecho);

  return (
    <section className="tarjeta flex flex-col gap-3 p-4">
      <div>
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-sm font-semibold">Tu complejo, listo para recibir reservas</p>
          <span className="t-display text-[18px] tabular">{porcentaje}%</span>
        </div>
        <div className="barra-progreso mt-2">
          <i style={{ width: `${porcentaje}%` }} />
        </div>
        <p className="mt-1.5 text-xs text-tinta-3">
          {hechos} de {pasos.length} pasos. Te {pendientes.length === 1 ? 'falta uno' : `faltan ${pendientes.length}`}:
        </p>
      </div>
      <ol className="flex flex-col">
        {pendientes.map((paso) => (
          <li key={paso.clave} className="flex items-center justify-between gap-3 border-t border-borde py-2.5">
            <span className="min-w-0">
              <span className="block text-sm font-semibold">{paso.titulo}</span>
              <span className="block text-xs text-tinta-3">{paso.detalle}</span>
            </span>
            {paso.clave === 'verificacion' && paso.detalle.startsWith('Ya lo') ? null : (
              <Link href={paso.href} className="btn btn-secundario btn-sm shrink-0">
                {paso.accion}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
