'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { COOKIE_UBICACION, DURACION_UBICACION_SEG } from '@/lib/ubicacion-comun';

// Si la persona la quitó a mano, no se vuelve a tomar sola.
const APAGADA = 'birteam_ubicacion_apagada';

function guardar(posicion: GeolocationPosition) {
  // Redondeada a 3 decimales (~100 m): alcanza para "a 1,2 km".
  const valor = `${posicion.coords.latitude.toFixed(3)},${posicion.coords.longitude.toFixed(3)}`;
  const segura = location.protocol === 'https:' ? '; secure' : '';
  document.cookie = `${COOKIE_UBICACION}=${valor}; path=/; max-age=${DURACION_UBICACION_SEG}; samesite=lax${segura}`;
}

function recordarApagada(apagada: boolean) {
  try {
    if (apagada) localStorage.setItem(APAGADA, '1');
    else localStorage.removeItem(APAGADA);
  } catch {
    // Sin almacenamiento: no pasa nada, solo no se recuerda.
  }
}

function estaApagada() {
  try {
    return localStorage.getItem(APAGADA) === '1';
  } catch {
    return false;
  }
}

/**
 * "Cerca de…": desde dónde se miden las distancias y el botón para usar la
 * ubicación del celular. Si ya dio permiso antes, se actualiza sola.
 */
export function UbicacionActual({
  origen,
  ciudad,
}: {
  origen: 'dispositivo' | 'ciudad' | null;
  ciudad: string | null;
}) {
  const router = useRouter();
  const [buscando, setBuscando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, refrescar] = useTransition();

  function pedir(silencioso = false) {
    if (!('geolocation' in navigator)) {
      if (!silencioso) setError('Este navegador no comparte la ubicación.');
      return;
    }
    if (!silencioso) setBuscando(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (posicion) => {
        guardar(posicion);
        recordarApagada(false);
        setBuscando(false);
        refrescar(() => router.refresh());
      },
      (falla) => {
        setBuscando(false);
        if (silencioso) return;
        setError(
          falla.code === falla.PERMISSION_DENIED
            ? 'No diste permiso. Activalo desde el candado de la barra de direcciones y probá de nuevo.'
            : 'No pudimos saber dónde estás. Probá de nuevo en un rato.'
        );
      },
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 5 * 60 * 1000 }
    );
  }

  // Ya dio permiso otra vez y la cookie venció: se toma sola, sin preguntar.
  useEffect(() => {
    if (origen === 'dispositivo' || estaApagada() || !navigator.permissions) return;
    navigator.permissions
      .query({ name: 'geolocation' })
      .then((estado) => {
        if (estado.state === 'granted') pedir(true);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [origen]);

  function quitar() {
    document.cookie = `${COOKIE_UBICACION}=; path=/; max-age=0`;
    recordarApagada(true);
    refrescar(() => router.refresh());
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <span className="flex min-w-0 items-center gap-2 text-[13px] text-tinta-2">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={origen === 'dispositivo' ? 'shrink-0 text-verde-txt' : 'shrink-0 text-tinta-3'}
            aria-hidden
          >
            <path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z" />
            <circle cx="12" cy="10" r="2.3" />
          </svg>
          {origen === 'dispositivo' ? (
            <span>
              Cerca de <strong className="font-semibold text-tinta">donde estás</strong>
            </span>
          ) : origen === 'ciudad' && ciudad ? (
            <span>
              Cerca de <strong className="font-semibold text-tinta">{ciudad}</strong>
            </span>
          ) : (
            <span>Sin ubicación: no podemos ordenar por cercanía.</span>
          )}
        </span>
        {origen === 'dispositivo' ? (
          <span className="flex gap-3">
            <button type="button" onClick={() => pedir()} disabled={buscando} className="text-[13px] font-semibold text-verde-txt">
              {buscando ? 'Buscando…' : 'Actualizar'}
            </button>
            <button type="button" onClick={quitar} className="text-[13px] font-semibold text-tinta-3 hover:text-tinta">
              Usar mi ciudad
            </button>
          </span>
        ) : (
          <button type="button" onClick={() => pedir()} disabled={buscando} className="text-[13px] font-semibold text-verde-txt">
            {buscando ? 'Buscando…' : 'Usar mi ubicación'}
          </button>
        )}
      </div>
      {error ? (
        <p className="text-xs text-naranja-txt" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
