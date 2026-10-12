'use client';

import { useState } from 'react';

/** "Agregar al calendario": Google Calendar o el calendario del celular (.ics). */
export function AgregarCalendario({ ics, google }: { ics: string; google: string }) {
  const [abierto, setAbierto] = useState(false);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => setAbierto(!abierto)}
        aria-expanded={abierto}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-tinta-2 hover:text-tinta"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
          <path d="M3.5 10h17M8 3v4M16 3v4M12 13.5v4M10 15.5h4" />
        </svg>
        Agregar al calendario
      </button>
      {abierto ? (
        <>
          <a href={google} target="_blank" rel="noopener noreferrer" className="chip-sel py-1.5 text-[11px]">
            Google Calendar
          </a>
          <a href={ics} download className="chip-sel py-1.5 text-[11px]">
            Calendario del celu
          </a>
        </>
      ) : null}
    </div>
  );
}
