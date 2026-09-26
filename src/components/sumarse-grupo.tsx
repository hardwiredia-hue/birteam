'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function BotonSumarme({ grupoId }: { grupoId: string }) {
  const router = useRouter();
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sumarse() {
    setEnviando(true);
    setError(null);
    const respuesta = await fetch('/api/grupos/unirse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ grupoId }),
    });
    if (!respuesta.ok) {
      const datos = await respuesta.json().catch(() => ({}));
      setError(datos.error ?? 'No pudimos sumarte.');
      setEnviando(false);
      return;
    }
    router.push(`/grupos/${grupoId}`);
    router.refresh();
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button type="button" className="btn btn-primario btn-sm" onClick={sumarse} disabled={enviando}>
        {enviando ? '…' : 'Sumarme'}
      </button>
      {error ? <p className="text-xs text-rojo">{error}</p> : null}
    </div>
  );
}
