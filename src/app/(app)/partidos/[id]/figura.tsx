'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface Candidato {
  usuarioId: string;
  nombre: string;
}

/** Votar la figura del partido (abierta) o ver quién fue (cerrada). */
export function FiguraDelPartido({
  partidoId,
  estado,
  candidatos,
  miVoto,
  puedoVotar,
  votaron,
  habilitados,
  ganadores,
  cierra,
}: {
  partidoId: string;
  estado: 'ABIERTA' | 'CERRADA';
  candidatos: Candidato[];
  miVoto: string | null;
  puedoVotar: boolean;
  votaron: number;
  habilitados: number;
  /** Al cerrar: los más votados con sus votos. */
  ganadores: { nombre: string; votos: number }[];
  /** "Cierra el sábado 21:00". */
  cierra: string;
}) {
  const router = useRouter();
  const [enviando, setEnviando] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function votar(elegidoId: string) {
    setEnviando(elegidoId);
    setError(null);
    const respuesta = await fetch(`/api/partidos/${partidoId}/figura`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ elegidoId }),
    });
    const datos = await respuesta.json().catch(() => ({}));
    setEnviando(null);
    if (!respuesta.ok) setError(datos.error ?? 'No se pudo votar.');
    router.refresh();
  }

  if (estado === 'CERRADA') {
    if (ganadores.length === 0) return null;
    return (
      <section className="tarjeta flex items-center gap-3 p-4">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--verde-txt)" strokeWidth="1.6" strokeLinejoin="round" aria-hidden>
          <path d="m12 3 2.6 5.5 6 .8-4.4 4.2 1.1 6L12 16.6 6.7 19.5l1.1-6L3.4 9.3l6-.8z" />
        </svg>
        <div className="min-w-0">
          <p className="t-rotulo text-verde-txt">{ganadores.length > 1 ? 'Figuras del partido' : 'Figura del partido'}</p>
          <p className="t-display text-[20px]">{ganadores.map((g) => g.nombre).join(' y ')}</p>
          <p className="text-xs text-tinta-3">
            {ganadores[0].votos} {ganadores[0].votos === 1 ? 'voto' : 'votos'} · votaron {votaron} de {habilitados}
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="tarjeta flex flex-col gap-3 p-4">
      <div>
        <p className="text-sm font-semibold">¿Quién fue la figura?</p>
        <p className="text-xs text-tinta-3">
          {puedoVotar
            ? miVoto
              ? 'Ya votaste; podés cambiarlo hasta que cierre.'
              : 'Votan los que jugaron. El resultado se ve al cerrar.'
            : 'Votan los que jugaron. El resultado se ve al cerrar.'}{' '}
          {cierra} · votaron {votaron} de {habilitados}.
        </p>
      </div>
      {puedoVotar ? (
        <div className="flex flex-wrap gap-2">
          {candidatos.map((candidato) => (
            <button
              key={candidato.usuarioId}
              type="button"
              disabled={enviando !== null}
              onClick={() => votar(candidato.usuarioId)}
              aria-pressed={miVoto === candidato.usuarioId}
              className={miVoto === candidato.usuarioId ? 'chip-sel chip-sel-activo' : 'chip-sel'}
            >
              {enviando === candidato.usuarioId ? '…' : candidato.nombre.split(' ')[0]}
            </button>
          ))}
        </div>
      ) : null}
      {error ? <p className="aviso-error">{error}</p> : null}
    </section>
  );
}
