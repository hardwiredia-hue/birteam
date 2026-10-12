import { rotuloDistancia } from '@/lib/geo';

/** Link de indicaciones: con coordenadas si hay, si no con la dirección. */
export function enlaceComoLlegar(lugar: {
  latitud: number | null;
  longitud: number | null;
  direccion?: string | null;
  ciudad?: string | null;
  provincia?: string | null;
}) {
  const destino =
    lugar.latitud != null && lugar.longitud != null
      ? `${lugar.latitud},${lugar.longitud}`
      : [lugar.direccion, lugar.ciudad, lugar.provincia].filter(Boolean).join(', ');
  return destino ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destino)}` : null;
}

/**
 * "Cómo llegar": abre el mapa del celular con el destino cargado. Si se
 * sabe desde dónde mide la persona, muestra a cuántos km está.
 */
export function ComoLlegar({
  lugar,
  km,
  aproximada = false,
  className = '',
}: {
  lugar: Parameters<typeof enlaceComoLlegar>[0];
  km?: number | null;
  /** La ubicación es el centro de la ciudad: distancia sin falsa precisión. */
  aproximada?: boolean;
  className?: string;
}) {
  const enlace = enlaceComoLlegar(lugar);
  if (!enlace) return null;
  return (
    <a
      href={enlace}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-1.5 self-start text-[13px] font-semibold text-verde-txt ${className}`}
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M3 11 21 3l-8 18-2-8z" />
      </svg>
      Cómo llegar
      {km != null ? <span className="font-normal text-tinta-3">· {rotuloDistancia(km, aproximada)}</span> : null}
    </a>
  );
}
