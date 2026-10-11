'use client';

/** Interruptor de la marca (pista 40×22, perilla 18×18, radio 6/4). */
export function Interruptor({
  prendido,
  alCambiar,
  rotulo,
  deshabilitado,
  peligro,
}: {
  prendido: boolean;
  alCambiar: (prendido: boolean) => void;
  /** Para lectores de pantalla, cuando no hay un texto pegado que lo nombre. */
  rotulo?: string;
  deshabilitado?: boolean;
  /** Prendido en rojo: para algo que corta el servicio (modo en construcción). */
  peligro?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={prendido}
      aria-label={rotulo}
      onClick={() => alCambiar(!prendido)}
      disabled={deshabilitado}
      className="relative h-[22px] w-10 shrink-0 rounded-[6px] border-0 transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50"
      style={{ background: prendido ? (peligro ? 'var(--rojo)' : 'var(--verde)') : 'var(--borde-2)' }}
    >
      <span
        className="absolute top-[2px] h-[18px] w-[18px] rounded-[4px] transition-all duration-150"
        style={{ left: prendido ? 20 : 2, background: prendido ? (peligro ? '#fff' : 'var(--sobre-verde)') : 'var(--tinta-2)' }}
      />
    </button>
  );
}
