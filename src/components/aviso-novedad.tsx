'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

const CLAVE = 'birteam_novedad_vista';

/**
 * La última novedad, arriba en Inicio, hasta que la persona la cierra (o
 * la abre). Se recuerda en este navegador; cuando hay otra nueva, vuelve.
 */
export function AvisoNovedad({ id, titulo, texto }: { id: string; titulo: string; texto: string }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      setVisible(localStorage.getItem(CLAVE) !== id);
    } catch {
      // Sin almacenamiento: no se muestra, para no insistir en cada visita.
    }
  }, [id]);

  function marcarVista() {
    setVisible(false);
    try {
      localStorage.setItem(CLAVE, id);
    } catch {
      // Nada que hacer.
    }
  }

  if (!visible) return null;
  return (
    <div className="tarjeta relative flex flex-col gap-1 p-4 pr-11">
      <p className="t-rotulo text-verde-txt">Novedad</p>
      <p className="text-[15px] font-semibold">{titulo}</p>
      <p className="text-[13px] leading-relaxed text-tinta-2">{texto}</p>
      <Link href="/ayuda/novedades" onClick={marcarVista} className="mt-1 self-start text-[13px] font-semibold text-verde-txt">
        Ver todas las novedades
      </Link>
      <button
        type="button"
        onClick={marcarVista}
        aria-label="Cerrar la novedad"
        className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-[6px] text-tinta-3 hover:text-tinta"
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
          <path d="M4 4l8 8M12 4l-8 8" />
        </svg>
      </button>
    </div>
  );
}
