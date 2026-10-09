import Link from 'next/link';

function Globito({ cantidad }: { cantidad: number }) {
  if (cantidad <= 0) return null;
  return (
    <span
      className="absolute -right-1 -top-1 h-4 min-w-4 rounded-full px-1 text-center text-[10px] font-bold leading-4 tabular"
      style={{ background: 'var(--verde)', color: 'var(--sobre-verde)' }}
    >
      {cantidad > 99 ? '99+' : cantidad}
    </span>
  );
}

/** Campanita y mensajes con sus contadores, para cabeceras. */
export function AccesosRapidos({ avisos, mensajes }: { avisos: number; mensajes: number }) {
  return (
    <div className="flex items-center gap-2">
      <Link
        href="/notificaciones"
        aria-label="Notificaciones"
        className="relative flex h-9 w-9 items-center justify-center rounded-[6px] border border-borde-2 text-tinta-2"
      >
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8a6 6 0 1 0-12 0c0 7-3 8-3 8h18s-3-1-3-8" />
          <path d="M13.7 21a2 2 0 0 1-3.4 0" />
        </svg>
        <Globito cantidad={avisos} />
      </Link>
      <Link
        href="/mensajes"
        aria-label="Mensajes"
        className="relative flex h-9 w-9 items-center justify-center rounded-[6px] border border-borde-2 text-tinta-2"
      >
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12a8 8 0 0 1-8 8H4l1.5-3.2A8 8 0 1 1 21 12z" />
        </svg>
        <Globito cantidad={mensajes} />
      </Link>
    </div>
  );
}
