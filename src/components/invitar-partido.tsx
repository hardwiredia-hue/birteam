'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { PartidoParaInvitar } from '@/lib/invitaciones';

/**
 * "Invitar a un partido" desde el perfil de alguien: elegís uno de tus
 * próximos partidos y le llega la invitación (la responde desde Inicio).
 */
export function InvitarAPartido({
  usuarioId,
  nombre,
  partidos,
}: {
  usuarioId: string;
  nombre: string;
  partidos: PartidoParaInvitar[];
}) {
  const [abierto, setAbierto] = useState(false);
  const [enviando, setEnviando] = useState<string | null>(null);
  const [invitados, setInvitados] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const cerrar = useRef<HTMLButtonElement>(null);
  const primerNombre = nombre.split(' ')[0];

  useEffect(() => {
    if (!abierto) return;
    const alTeclear = (evento: KeyboardEvent) => evento.key === 'Escape' && setAbierto(false);
    const desborde = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', alTeclear);
    cerrar.current?.focus();
    return () => {
      document.body.style.overflow = desborde;
      document.removeEventListener('keydown', alTeclear);
    };
  }, [abierto]);

  async function invitar(partidoId: string) {
    setEnviando(partidoId);
    setError(null);
    const respuesta = await fetch(`/api/partidos/${partidoId}/invitar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usuarioId }),
    });
    setEnviando(null);
    if (!respuesta.ok) {
      const datos = await respuesta.json().catch(() => ({}));
      setError(datos.error ?? 'No pudimos mandar la invitación.');
      return;
    }
    setInvitados((lista) => [...lista, partidoId]);
  }

  return (
    <>
      <button type="button" onClick={() => setAbierto(true)} className="btn btn-secundario btn-sm" aria-haspopup="dialog">
        Invitar a un partido
      </button>
      {abierto
        ? createPortal(
            <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="presentation">
              <button
                type="button"
                aria-label="Cerrar"
                tabIndex={-1}
                className="absolute inset-0 cursor-default bg-black/60"
                onClick={() => setAbierto(false)}
              />
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="invitar-titulo"
                className="relative flex max-h-[80dvh] w-full max-w-md flex-col gap-4 overflow-y-auto rounded-t-[12px] border border-borde bg-panel p-5 pb-8 sm:max-w-sm sm:rounded-[12px] sm:pb-5"
              >
                <div className="flex items-center justify-between gap-3">
                  <p id="invitar-titulo" className="text-base font-semibold">
                    Invitar a {primerNombre}
                  </p>
                  <button
                    ref={cerrar}
                    type="button"
                    onClick={() => setAbierto(false)}
                    aria-label="Cerrar"
                    className="flex h-8 w-8 items-center justify-center rounded-[6px] text-tinta-3 hover:text-tinta"
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
                      <path d="M4 4l8 8M12 4l-8 8" />
                    </svg>
                  </button>
                </div>

                {partidos.length === 0 ? (
                  <div className="flex flex-col gap-3">
                    <p className="text-sm text-tinta-2">
                      No tenés partidos próximos a los que puedas invitarlo. Armá uno y sumalo al crearlo.
                    </p>
                    <Link href="/crear" className="btn btn-secundario btn-sm self-start">
                      Crear partido
                    </Link>
                  </div>
                ) : (
                  <ul className="flex flex-col">
                    {partidos.map((partido) => {
                      const listo = invitados.includes(partido.id);
                      return (
                        <li key={partido.id} className="flex items-center gap-3 border-b border-borde py-3 last:border-b-0">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold">{partido.titulo}</p>
                            <p className="truncate text-xs text-tinta-3">
                              {partido.lugar}
                              {partido.faltan > 0 ? ` · faltan ${partido.faltan}` : ' · completo'}
                            </p>
                          </div>
                          <button
                            type="button"
                            disabled={listo || enviando !== null}
                            onClick={() => invitar(partido.id)}
                            className={listo ? 'text-xs font-semibold text-verde-txt' : 'btn btn-secundario btn-sm'}
                          >
                            {listo ? 'Invitado' : enviando === partido.id ? '…' : 'Invitar'}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
                {error ? <p className="aviso-error">{error}</p> : null}
                <p className="text-xs text-tinta-3">Le llega un aviso y responde Voy o No voy desde su Inicio.</p>
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  );
}
