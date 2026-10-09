'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

/** Mientras Mercado Pago confirma, la página se vuelve a consultar sola (hasta 2 minutos). */
export function EsperarConfirmacion() {
  const router = useRouter();
  useEffect(() => {
    let vueltas = 0;
    const intervalo = setInterval(() => {
      vueltas++;
      if (vueltas > 30) clearInterval(intervalo);
      else router.refresh();
    }, 4000);
    return () => clearInterval(intervalo);
  }, [router]);
  return null;
}
