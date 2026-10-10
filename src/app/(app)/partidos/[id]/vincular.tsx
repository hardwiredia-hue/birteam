'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function VincularTurno({ partidoId, reservaId }: { partidoId: string; reservaId: string }) {
  const router = useRouter();
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function vincular() {
    setEnviando(true);
    setError(null);
    const respuesta = await fetch(`/api/partidos/${partidoId}/vincular`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reservaId }),
    });
    const datos = await respuesta.json().catch(() => ({}));
    setEnviando(false);
    if (!respuesta.ok) {
      setError(datos.error ?? 'No se pudo vincular.');
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-2">
      <button type="button" className="btn btn-primario btn-sm self-start" disabled={enviando} onClick={vincular}>
        {enviando ? 'Vinculando…' : 'Usar este turno para el partido'}
      </button>
      {error ? <p className="aviso-error">{error}</p> : null}
    </div>
  );
}
