/**
 * Íconos de deportes, de un solo color (toman el color del texto, así
 * acompañan el estado del chip). Trazo fino, mismo lenguaje que la barra.
 */
const TRAZOS: Record<string, React.ReactNode> = {
  futbol: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5l3.8 2.8-1.5 4.4H9.7l-1.5-4.4z" />
      <path d="M12 7.5V3.2M15.8 10.3l4.1-1.4M14.3 14.7l2.6 3.6M9.7 14.7l-2.6 3.6M8.2 10.3L4.1 8.9" />
    </>
  ),
  basquet: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3v18" />
      <path d="M5.6 5.6c2.4 2.2 3.4 4.3 3.4 6.4s-1 4.2-3.4 6.4M18.4 5.6c-2.4 2.2-3.4 4.3-3.4 6.4s1 4.2 3.4 6.4" />
    </>
  ),
  voley: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3c1.5 3.5 1.5 6.5 0 9M12 12c-3.3 1.6-6.3 1.7-8.6.4M12 12c2 3 4.8 4.6 7.5 4.4" />
      <path d="M8.2 4c3.2.4 6.6 2.4 8.6 5.6M3.4 14.6c.6-3.2 2.7-6 5.6-7.6" />
    </>
  ),
  rugby: (
    <>
      <ellipse cx="12" cy="12" rx="9.5" ry="5.5" transform="rotate(-35 12 12)" />
      <path d="M8.5 15.5l7-7M10 12.4l1.6 1.6M11.6 10.8l1.6 1.6M13.2 9.2l1.6 1.6" />
    </>
  ),
  tenis: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M5.6 5.6c3 3 3 9.8 0 12.8M18.4 5.6c-3 3-3 9.8 0 12.8" />
    </>
  ),
  padel: (
    <>
      <path d="M7 3.5h7a3.5 3.5 0 0 1 3.5 3.5v5a3.5 3.5 0 0 1-3.5 3.5H7A3.5 3.5 0 0 1 3.5 12V7A3.5 3.5 0 0 1 7 3.5z" />
      <path d="M10.5 15.5v5" />
      <circle cx="8" cy="8" r=".6" fill="currentColor" />
      <circle cx="13" cy="8" r=".6" fill="currentColor" />
      <circle cx="10.5" cy="11" r=".6" fill="currentColor" />
      <circle cx="19" cy="19" r="1.8" />
    </>
  ),
  hockey: (
    <>
      <path d="M15 3l-6.5 14.2a2 2 0 0 1-1.8 1.2H4" />
      <path d="M4 18.4v-2.2" />
      <circle cx="17.5" cy="18" r="2" />
    </>
  ),
  handball: (
    <>
      <path d="M3 20V7h11v13" />
      <path d="M3 11h11M3 15h11M6.7 7v13M10.3 7v13" />
      <circle cx="18.5" cy="6.5" r="2.5" />
    </>
  ),
  running: (
    <>
      <circle cx="14.5" cy="4.5" r="1.8" />
      <path d="M9 21l2.6-5.4 3.2 2.4 1.2 3" />
      <path d="M6 11.5l3.5-3h4l2.5 3.5 3 .5" />
      <path d="M11.6 15.6l1.6-7.1" />
    </>
  ),
  ciclismo: (
    <>
      <circle cx="5.5" cy="16.5" r="3.5" />
      <circle cx="18.5" cy="16.5" r="3.5" />
      <path d="M5.5 16.5l4-7.5h6l3 7.5M9.5 9l3.5 7.5h-7.5M14 6h2.5l-1 3" />
    </>
  ),
  motociclismo: (
    <>
      <path d="M4 15a8 8 0 0 1 16-2.5V16a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" />
      <path d="M12 9.5h7.5M10 14h10" />
    </>
  ),
  natacion: (
    <>
      <circle cx="16" cy="7" r="2" />
      <path d="M4 11.5l5-2.5 3.5 2 3-1.5" />
      <path d="M2.5 16c1.6 0 1.6-1.2 3.2-1.2s1.6 1.2 3.2 1.2 1.6-1.2 3.2-1.2 1.6 1.2 3.2 1.2 1.6-1.2 3.2-1.2 1.6 1.2 3 1.2" />
      <path d="M2.5 20c1.6 0 1.6-1.2 3.2-1.2s1.6 1.2 3.2 1.2 1.6-1.2 3.2-1.2 1.6 1.2 3.2 1.2 1.6-1.2 3.2-1.2 1.6 1.2 3 1.2" />
    </>
  ),
  skate: (
    <>
      <path d="M2.5 11.5c1 1.5 2 2 3.5 2h12c1.5 0 2.5-.5 3.5-2" />
      <circle cx="7" cy="17" r="1.8" />
      <circle cx="17" cy="17" r="1.8" />
    </>
  ),
  generico: (
    <>
      <path d="M8 4h8v5a4 4 0 0 1-8 0z" />
      <path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8.5 20h7M10 17h4" />
    </>
  ),
};

export function IconoDeporte({ icono, tam = 16 }: { icono: string; tam?: number }) {
  return (
    <svg
      width={tam}
      height={tam}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="shrink-0"
    >
      {TRAZOS[icono] ?? TRAZOS.generico}
    </svg>
  );
}
