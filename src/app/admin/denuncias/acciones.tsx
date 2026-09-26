'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function AccionesDenuncia({ denunciaId }: { denunciaId: string }) {
  const router = useRouter();
  const [enviando, setEnviando] = useState<string | null>(null);

  async function cerrar(estado: 'RESUELTA' | 'DESCARTADA') {
    setEnviando(estado);
    await fetch('/api/admin/denuncias', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ denunciaId, estado }),
    });
    setEnviando(null);
    router.refresh();
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      <button
        type="button"
        className="btn btn-fantasma btn-sm"
        onClick={() => cerrar('DESCARTADA')}
        disabled={enviando !== null}
      >
        {enviando === 'DESCARTADA' ? '…' : 'Descartar'}
      </button>
      <button
        type="button"
        className="btn btn-secundario btn-sm"
        onClick={() => cerrar('RESUELTA')}
        disabled={enviando !== null}
      >
        {enviando === 'RESUELTA' ? '…' : 'Marcar resuelta'}
      </button>
    </div>
  );
}
