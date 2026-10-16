'use client';

import { useEffect, useState } from 'react';
import { resumirPronostico, urlPronostico, type Pronostico } from '@/lib/pronostico';

/**
 * "Pronóstico: 18° · Nublado · 70% de lluvia". Lo pide el navegador; si no
 * hay respuesta, no se muestra nada.
 */
export function PronosticoPartido({
  latitud,
  longitud,
  inicio,
  minutos,
  techada,
}: {
  latitud: number;
  longitud: number;
  /** ISO del comienzo. */
  inicio: string;
  minutos: number;
  techada: boolean;
}) {
  const [pronostico, setPronostico] = useState<Pronostico | null>(null);

  useEffect(() => {
    const control = new AbortController();
    const tiempo = setTimeout(() => control.abort(), 8000);
    fetch(urlPronostico(latitud, longitud), { signal: control.signal })
      .then((respuesta) => (respuesta.ok ? respuesta.json() : null))
      .then((datos) => {
        if (datos) setPronostico(resumirPronostico(datos, new Date(inicio), minutos));
      })
      .catch(() => {})
      .finally(() => clearTimeout(tiempo));
    return () => {
      clearTimeout(tiempo);
      control.abort();
    };
  }, [latitud, longitud, inicio, minutos]);

  if (!pronostico) return null;
  return (
    <div className="flex flex-col gap-0.5">
      <p className="flex flex-wrap items-center gap-x-2 text-[13px] text-tinta-2">
        <span className="t-rotulo">Pronóstico</span>
        <span className="font-semibold text-tinta tabular">{pronostico.temperatura}°</span>
        <span>{pronostico.cielo}</span>
        {pronostico.lluvia > 0 ? (
          <span className={pronostico.mojado ? 'font-semibold text-naranja-txt tabular' : 'tabular'}>
            {pronostico.lluvia}% de lluvia
          </span>
        ) : null}
        {pronostico.viento >= 30 ? <span className="tabular">viento {pronostico.viento} km/h</span> : null}
      </p>
      {pronostico.mojado ? (
        <p className="text-xs text-tinta-3">
          {techada ? 'La cancha es techada: se juega igual.' : 'Puede llover: coordinen por el chat del partido.'}
        </p>
      ) : null}
    </div>
  );
}
