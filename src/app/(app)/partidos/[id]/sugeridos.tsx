'use client';

import { EnlaceAyuda } from '@/components/ayuda';
import Link from 'next/link';
import { useState } from 'react';
import { Avatar } from '@/components/avatar';

/**
 * "Pueden venir": jugadores cerca que marcaron que pueden ese día y franja.
 * El organizador los invita de un toque (les llega el aviso).
 */
export function SugeridosPartido({
  partidoId,
  faltan,
  sugeridos,
}: {
  partidoId: string;
  faltan: number;
  sugeridos: { id: string; nombre: string; usuario: string; avatarUrl: string | null }[];
}) {
  const [invitados, setInvitados] = useState<string[]>([]);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  if (sugeridos.length === 0) return null;

  async function invitar(usuarioId: string) {
    setOcupado(usuarioId);
    setError(null);
    const respuesta = await fetch(`/api/partidos/${partidoId}/invitar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usuarioId }),
    });
    setOcupado(null);
    if (!respuesta.ok) {
      setError((await respuesta.json().catch(() => ({}))).error ?? 'No pudimos invitarlo.');
      return;
    }
    setInvitados((previos) => [...previos, usuarioId]);
  }

  return (
    <section className="tarjeta flex flex-col gap-2 p-4">
      <div>
        <p className="t-rotulo text-verde-txt">Pueden venir · faltan {faltan}</p>
        <p className="mt-0.5 text-xs text-tinta-3">Juegan este deporte, están cerca y marcaron que pueden ese día a esa hora.</p>
        <EnlaceAyuda tema="partidos" articulo="invitar" className="mt-1" />
      </div>
      <ul className="flex flex-col">
        {sugeridos.map((persona) => {
          const listo = invitados.includes(persona.id);
          return (
            <li key={persona.id} className="flex items-center gap-3 border-t border-borde py-2 first:border-t-0">
              <Avatar nombre={persona.nombre} avatarUrl={persona.avatarUrl} tam={30} />
              <Link href={`/jugadores/${persona.usuario}`} className="min-w-0 flex-1 truncate text-sm font-semibold">
                {persona.nombre}
              </Link>
              <button
                type="button"
                className={listo ? 'chip-sel chip-sel-activo shrink-0' : 'btn btn-secundario btn-sm shrink-0'}
                disabled={listo || ocupado === persona.id}
                onClick={() => invitar(persona.id)}
              >
                {listo ? 'Invitado' : ocupado === persona.id ? '…' : 'Invitar'}
              </button>
            </li>
          );
        })}
      </ul>
      {error ? <p className="aviso-error">{error}</p> : null}
    </section>
  );
}
