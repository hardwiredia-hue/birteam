'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

/** El complejo marca que el jugador no fue al turno (o lo corrige). */
export function MarcarAsistencia({ reservaId, noVino, jugador }: { reservaId: string; noVino: boolean; jugador: string }) {
  const router = useRouter();
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function marcar() {
    if (!noVino && !window.confirm(`¿${jugador} no vino al turno? Le avisamos y queda en su historial.`)) return;
    setEnviando(true);
    setError(null);
    const respuesta = await fetch(`/api/reservas/${reservaId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accion: noVino ? 'vino' : 'no_vino' }),
    });
    const datos = await respuesta.json().catch(() => ({}));
    setEnviando(false);
    if (!respuesta.ok) setError(datos.error ?? 'No se pudo marcar.');
    router.refresh();
  }

  return (
    <div className="flex shrink-0 flex-col items-end gap-1">
      <button
        type="button"
        className={noVino ? 'text-xs font-semibold text-tinta-3' : 'btn btn-secundario btn-sm'}
        disabled={enviando}
        onClick={marcar}
      >
        {noVino ? 'Deshacer' : 'No vino'}
      </button>
      {error ? <p className="text-xs text-rojo">{error}</p> : null}
    </div>
  );
}
