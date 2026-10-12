'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatearPlata } from '@/lib/formato';
import { Avatar } from '@/components/avatar';

interface Jugador {
  usuarioId: string;
  nombre: string;
  avatarUrl: string | null;
  pago: boolean;
}

/**
 * La cuenta del organizador: quién ya pagó su parte. Se toca a cada uno y
 * queda marcado; a los que faltan se les manda un recordatorio por WhatsApp.
 */
export function Pagos({
  partidoId,
  costo,
  titulo,
  jugadores: iniciales,
}: {
  partidoId: string;
  costo: number;
  /** "Fútbol 5 del jueves", para el recordatorio. */
  titulo: string;
  jugadores: Jugador[];
}) {
  const router = useRouter();
  const [jugadores, setJugadores] = useState(iniciales);
  const [error, setError] = useState<string | null>(null);

  const pagaron = jugadores.filter((j) => j.pago);
  const faltan = jugadores.filter((j) => !j.pago);

  async function marcar(usuarioId: string, pago: boolean) {
    setError(null);
    setJugadores((lista) => lista.map((j) => (j.usuarioId === usuarioId ? { ...j, pago } : j)));
    const respuesta = await fetch(`/api/partidos/${partidoId}/pagos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usuarioId, pago }),
    });
    if (!respuesta.ok) {
      const datos = await respuesta.json().catch(() => ({}));
      setError(datos.error ?? 'No pudimos guardarlo.');
      setJugadores((lista) => lista.map((j) => (j.usuarioId === usuarioId ? { ...j, pago: !pago } : j)));
      return;
    }
    router.refresh();
  }

  const recordatorio = `Recordatorio del ${titulo}: faltan pagar ${formatearPlata(costo)} ${faltan
    .map((j) => j.nombre.split(' ')[0])
    .join(', ')}. ¡Gracias!`;

  return (
    <section className="tarjeta flex flex-col gap-3 p-4">
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <p className="text-sm font-semibold tabular">{formatearPlata(costo)} por jugador</p>
          <p className="text-xs text-tinta-3">
            Cobrado {formatearPlata(pagaron.length * costo)} de {formatearPlata(jugadores.length * costo)}
          </p>
        </div>
        <p className="t-rotulo tabular">
          Pagaron {pagaron.length}/{jugadores.length}
        </p>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-borde" aria-hidden>
        <div
          className="h-full rounded-full bg-verde transition-all"
          style={{ width: `${jugadores.length ? (pagaron.length / jugadores.length) * 100 : 0}%` }}
        />
      </div>

      {error ? <p className="aviso-error">{error}</p> : null}

      <ul className="flex flex-col">
        {jugadores.map((jugador) => (
          <li key={jugador.usuarioId}>
            <button
              type="button"
              onClick={() => marcar(jugador.usuarioId, !jugador.pago)}
              aria-pressed={jugador.pago}
              className="flex w-full items-center gap-3 border-b border-borde py-2.5 text-left last:border-b-0"
            >
              <Avatar nombre={jugador.nombre} avatarUrl={jugador.avatarUrl} tam={28} />
              <span className="min-w-0 flex-1 truncate text-sm">{jugador.nombre}</span>
              <span
                className="rounded-[6px] border px-2.5 py-1 text-xs font-semibold"
                style={
                  jugador.pago
                    ? { borderColor: 'var(--verde-txt)', color: 'var(--verde-txt)' }
                    : { borderColor: 'var(--borde-2)', color: 'var(--tinta-3)' }
                }
              >
                {jugador.pago ? 'Pagó' : 'Debe'}
              </span>
            </button>
          </li>
        ))}
      </ul>

      {faltan.length > 0 ? (
        <a
          href={`https://wa.me/?text=${encodeURIComponent(recordatorio)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-secundario btn-sm self-start"
        >
          Recordarles por WhatsApp
        </a>
      ) : (
        <p className="text-xs font-semibold text-verde-txt">Pagaron todos.</p>
      )}
      <p className="text-xs text-tinta-3">La plata se arregla entre ustedes; esto es solo para llevar la cuenta.</p>
    </section>
  );
}
