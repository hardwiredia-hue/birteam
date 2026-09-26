'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function ListaBloqueados({
  bloqueados,
}: {
  bloqueados: { id: string; nombre: string; usuario: string }[];
}) {
  const router = useRouter();
  const [quitando, setQuitando] = useState<string | null>(null);

  if (bloqueados.length === 0) return null;

  async function desbloquear(usuarioId: string) {
    setQuitando(usuarioId);
    await fetch('/api/bloqueos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usuarioId, accion: 'desbloquear' }),
    });
    setQuitando(null);
    router.refresh();
  }

  return (
    <section>
      <p className="t-rotulo mb-1">Bloqueados · {bloqueados.length}</p>
      <div>
        {bloqueados.map((persona) => (
          <div key={persona.id} className="flex items-center gap-3 border-b border-borde py-2.5 last:border-b-0">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{persona.nombre}</p>
              <p className="text-xs text-tinta-3">@{persona.usuario}</p>
            </div>
            <button
              type="button"
              className="btn btn-secundario btn-sm"
              onClick={() => desbloquear(persona.id)}
              disabled={quitando === persona.id}
            >
              {quitando === persona.id ? '…' : 'Desbloquear'}
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
