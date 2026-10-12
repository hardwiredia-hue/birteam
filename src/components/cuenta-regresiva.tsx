'use client';

import { useEffect, useState } from 'react';

function restante(hasta: number) {
  const segundos = Math.max(0, Math.floor((hasta - Date.now()) / 1000));
  const h = Math.floor(segundos / 3600);
  const m = Math.floor((segundos % 3600) / 60);
  const s = segundos % 60;
  return { segundos, texto: [h, m, s].map((n) => String(n).padStart(2, '0')).join(':') };
}

/** Cuenta regresiva HH:MM:SS hasta una fecha; al llegar a cero avisa una vez. */
export function CuentaRegresiva({
  hasta,
  alTerminar,
  className = '',
}: {
  hasta: string;
  alTerminar?: () => void;
  className?: string;
}) {
  const limite = new Date(hasta).getTime();
  // Arranca vacío para que el servidor y el navegador muestren lo mismo.
  const [texto, setTexto] = useState<string | null>(null);

  useEffect(() => {
    let avisado = false;
    const tic = () => {
      const r = restante(limite);
      setTexto(r.texto);
      if (r.segundos === 0 && !avisado) {
        avisado = true;
        alTerminar?.();
      }
    };
    tic();
    const intervalo = setInterval(tic, 1000);
    return () => clearInterval(intervalo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [limite]);

  return (
    <span className={`font-mono tabular ${className}`} role="timer" aria-live="off">
      {texto ?? '--:--:--'}
    </span>
  );
}
