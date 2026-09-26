'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function BotoneraRsvp({
  partidoId,
  estadoActual,
}: {
  partidoId: string;
  estadoActual: string | null;
}) {
  const router = useRouter();
  const [enviando, setEnviando] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function elegir(estado: 'VOY' | 'TALVEZ' | 'NOVOY') {
    setEnviando(estado);
    setError(null);
    const respuesta = await fetch(`/api/partidos/${partidoId}/rsvp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado }),
    });
    if (!respuesta.ok) {
      const datos = await respuesta.json().catch(() => ({}));
      setError(datos.error ?? 'No pudimos guardar tu respuesta.');
    }
    setEnviando(null);
    router.refresh();
  }

  const enEspera = estadoActual === 'ESPERA';

  return (
    <div className="flex flex-col gap-2">
      {error ? <p className="aviso-error">{error}</p> : null}
      {enEspera ? (
        <p className="aviso-ok border-azul-txt text-azul-txt">
          Estás en la lista de espera. Si se libera un lugar, entrás y te avisamos.
        </p>
      ) : null}
      <div className="grid grid-cols-[1.6fr_1fr_1fr] gap-2">
        <button
          type="button"
          className={estadoActual === 'VOY' || enEspera ? 'btn btn-primario' : 'btn btn-secundario'}
          disabled={enviando !== null}
          onClick={() => elegir('VOY')}
        >
          {enviando === 'VOY' ? '…' : 'Voy'}
        </button>
        <button
          type="button"
          className="btn btn-secundario"
          style={estadoActual === 'TALVEZ' ? { borderColor: 'var(--naranja-txt)', color: 'var(--naranja-txt)' } : undefined}
          disabled={enviando !== null}
          onClick={() => elegir('TALVEZ')}
        >
          {enviando === 'TALVEZ' ? '…' : 'Tal vez'}
        </button>
        <button
          type="button"
          className="btn btn-fantasma"
          style={estadoActual === 'NOVOY' ? { color: 'var(--tinta)' } : undefined}
          disabled={enviando !== null}
          onClick={() => elegir('NOVOY')}
        >
          {enviando === 'NOVOY' ? '…' : 'No voy'}
        </button>
      </div>
    </div>
  );
}

export function CompartirPartido({ rutaPublica }: { rutaPublica: string }) {
  const [copiado, setCopiado] = useState(false);

  async function compartir() {
    // El link público: se abre sin cuenta y invita a sumarse en 30 segundos.
    const url = `${window.location.origin}${rutaPublica}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Partido en birteam', url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      // El usuario canceló el share; nada que hacer.
    }
  }

  return (
    <button type="button" className="btn btn-secundario" onClick={compartir}>
      {copiado ? 'Link copiado ✓' : 'Compartir el partido'}
    </button>
  );
}
