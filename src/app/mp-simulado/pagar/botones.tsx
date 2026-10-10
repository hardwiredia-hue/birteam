'use client';

import { useState } from 'react';

export function BotonesPagoSimulado({ reservaId }: { reservaId: string }) {
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pagar(resultado: 'aprobado' | 'rechazado') {
    setEnviando(true);
    setError(null);
    const respuesta = await fetch('/api/mp-simulado/pagar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reservaId, resultado }),
    });
    const datos = await respuesta.json().catch(() => ({}));
    if (!respuesta.ok) {
      setEnviando(false);
      setError(datos.error ?? 'No se pudo simular el pago.');
      return;
    }
    // Igual que el checkout real: vuelve a birteam con el id del pago.
    window.location.href = datos.vuelta;
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        disabled={enviando}
        onClick={() => pagar('aprobado')}
        className="rounded-[6px] px-4 py-3 text-sm font-bold text-white"
        style={{ background: '#009ee3' }}
      >
        Pagar (aprobado)
      </button>
      <button
        type="button"
        disabled={enviando}
        onClick={() => pagar('rechazado')}
        className="rounded-[6px] border px-4 py-3 text-sm font-bold"
        style={{ borderColor: '#bbb', color: '#333' }}
      >
        Simular pago rechazado
      </button>
      {error ? <p className="text-sm" style={{ color: '#c0392b' }}>{error}</p> : null}
    </div>
  );
}
