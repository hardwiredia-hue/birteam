'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

export interface EntradaAyuda {
  href: string;
  tema: string;
  titulo: string;
  /** Todo el texto del artículo, para buscar y armar el extracto. */
  cuerpo: string;
}

/** Minúsculas y sin tildes: "pádel" encuentra "padel" y al revés. */
const normalizar = (texto: string) =>
  texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

/** El pedazo del texto donde aparece la primera palabra buscada. */
function extracto(cuerpo: string, palabra: string) {
  const posicion = normalizar(cuerpo).indexOf(palabra);
  if (posicion < 0) return cuerpo.slice(0, 140) + (cuerpo.length > 140 ? '…' : '');
  const desde = Math.max(0, cuerpo.lastIndexOf(' ', Math.max(0, posicion - 50)));
  const hasta = Math.min(cuerpo.length, posicion + 110);
  return `${desde > 0 ? '…' : ''}${cuerpo.slice(desde, hasta).trim()}${hasta < cuerpo.length ? '…' : ''}`;
}

/**
 * Buscador del centro de ayuda. Sin texto muestra lo de siempre (temas y
 * preguntas frecuentes); al escribir, los artículos que coinciden.
 */
export function BuscadorAyuda({ entradas, children }: { entradas: EntradaAyuda[]; children: React.ReactNode }) {
  const [consulta, setConsulta] = useState('');

  const indice = useMemo(
    () => entradas.map((e) => ({ ...e, enTitulo: normalizar(e.titulo), enCuerpo: normalizar(`${e.tema} ${e.cuerpo}`) })),
    [entradas]
  );
  const palabras = normalizar(consulta).split(/\s+/).filter((p) => p.length > 1);
  const resultados =
    palabras.length === 0
      ? []
      : indice
          .filter((e) => palabras.every((p) => e.enTitulo.includes(p) || e.enCuerpo.includes(p)))
          // Primero los que lo tienen en el título.
          .map((e) => ({ ...e, peso: palabras.filter((p) => e.enTitulo.includes(p)).length }))
          .sort((a, b) => b.peso - a.peso)
          .slice(0, 12);

  return (
    <>
      <div className="relative">
        <svg
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-tinta-3"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          aria-hidden
        >
          <circle cx="11" cy="11" r="6.5" />
          <path d="m16 16 4.5 4.5" />
        </svg>
        <input
          type="search"
          value={consulta}
          onChange={(evento) => setConsulta(evento.target.value)}
          placeholder="Buscá: cancelar turno, lista de espera, cobrar…"
          className="campo pl-11 text-[15px]"
          aria-label="Buscar en la ayuda"
        />
      </div>

      {palabras.length === 0 ? (
        children
      ) : (
        <section className="flex flex-col gap-3" aria-live="polite">
          <p className="t-rotulo">
            {resultados.length === 0
              ? 'Sin resultados'
              : `${resultados.length} ${resultados.length === 1 ? 'resultado' : 'resultados'}`}
          </p>
          {resultados.length === 0 ? (
            <p className="text-sm text-tinta-2">
              No encontramos nada con &ldquo;{consulta.trim()}&rdquo;. Probá con otra palabra o mirá los temas.
            </p>
          ) : (
            <ul className="flex flex-col divide-y divide-borde border-y border-borde">
              {resultados.map((r) => (
                <li key={r.href}>
                  <Link href={r.href} className="flex flex-col gap-1 py-3.5 hover:text-verde-txt">
                    <span className="t-rotulo">{r.tema}</span>
                    <span className="text-[15px] font-semibold">{r.titulo}</span>
                    <span className="text-[13px] leading-relaxed text-tinta-2">{extracto(r.cuerpo, palabras[0])}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </>
  );
}
