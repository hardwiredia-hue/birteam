'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

/** El jugador deja su turno fijo: se liberan las semanas que vienen y se avisa al complejo. */
export function DejarFijo({ canchaId, fijoId, rotulo }: { canchaId: string; fijoId: string; rotulo: string }) {
  const router = useRouter();
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function dejar() {
    if (!window.confirm(`¿Dejar tu turno fijo de los ${rotulo}? Se liberan todas las semanas que vienen.`)) return;
    setEnviando(true);
    setError(null);
    const respuesta = await fetch(`/api/canchas/${canchaId}/fijos`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: fijoId }),
    });
    setEnviando(false);
    if (!respuesta.ok) {
      const datos = await respuesta.json().catch(() => ({}));
      setError(datos.error ?? 'No se pudo dejar el turno.');
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button type="button" className="text-xs font-semibold text-tinta-3" disabled={enviando} onClick={dejar}>
        {enviando ? 'Dejando…' : 'Dejar el fijo'}
      </button>
      {error ? <p className="text-xs text-rojo">{error}</p> : null}
    </div>
  );
}
