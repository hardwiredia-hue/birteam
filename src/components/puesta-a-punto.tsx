'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { Paso } from '@/lib/puesta-a-punto';

/**
 * "Al 60%": los pasos que faltan, cada uno con su atajo. Con `ocultable`,
 * tiene "Ahora no" y se recuerda en este navegador (bajo esa clave).
 */
export function PuestaAPunto({
  pasos,
  titulo = 'Tu complejo, listo para recibir reservas',
  ocultable,
}: {
  pasos: Paso[];
  titulo?: string;
  ocultable?: string;
}) {
  const [oculta, setOculta] = useState(Boolean(ocultable));
  useEffect(() => {
    if (!ocultable) return;
    try {
      setOculta(localStorage.getItem(ocultable) === '1');
    } catch {
      setOculta(false);
    }
  }, [ocultable]);

  function ocultar() {
    setOculta(true);
    try {
      localStorage.setItem(ocultable!, '1');
    } catch {
      // Sin almacenamiento: se oculta solo por ahora.
    }
  }

  const hechos = pasos.filter((p) => p.hecho).length;
  if (hechos === pasos.length || oculta) return null;
  const porcentaje = Math.round((hechos / pasos.length) * 100);
  const pendientes = pasos.filter((p) => !p.hecho);

  return (
    <section className="tarjeta flex flex-col gap-3 p-4">
      <div>
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-sm font-semibold">{titulo}</p>
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
      {ocultable ? (
        <button type="button" onClick={ocultar} className="self-start text-xs font-semibold text-tinta-3 hover:text-tinta">
          Ahora no
        </button>
      ) : null}
    </section>
  );
}
