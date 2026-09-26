'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function BotonUnirse({ token, grupoId }: { token: string; grupoId: string }) {
  const router = useRouter();
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function unirse() {
    setEnviando(true);
    setError(null);
    const respuesta = await fetch('/api/grupos/unirse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    if (!respuesta.ok) {
      const datos = await respuesta.json().catch(() => ({}));
      setError(datos.error ?? 'No pudimos sumarte. Probá de nuevo.');
      setEnviando(false);
      return;
    }
    router.push(`/grupos/${grupoId}`);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-2">
      {error ? <p className="aviso-error">{error}</p> : null}
      <button type="button" className="btn btn-primario" onClick={unirse} disabled={enviando}>
        {enviando ? 'Sumándote…' : 'Sumarme al grupo'}
      </button>
    </div>
  );
}
