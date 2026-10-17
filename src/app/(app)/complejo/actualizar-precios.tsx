'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { PORCENTAJE_MAXIMO, PORCENTAJE_MINIMO, REDONDEOS, nuevoPrecio } from '@/lib/precios';

const plata = (monto: number) => `$${Math.round(monto).toLocaleString('es-AR')}`;

/**
 * "Actualizar precios": un porcentaje para todas las canchas a la vez, con
 * la vista previa de cómo queda cada una antes de aplicarlo.
 */
export function ActualizarPrecios({
  canchas,
}: {
  canchas: { id: string; nombre: string; precioPorHora: number | null; precioPico: number | null }[];
}) {
  const router = useRouter();
  const [, refrescar] = useTransition();
  const [abierto, setAbierto] = useState(false);
  const [porcentaje, setPorcentaje] = useState(10);
  const [redondeo, setRedondeo] = useState<number>(500);
  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const conPrecio = canchas.filter((c) => c.precioPorHora != null || c.precioPico != null);
  if (conPrecio.length === 0) return null;
  const valido = porcentaje !== 0 && porcentaje >= PORCENTAJE_MINIMO && porcentaje <= PORCENTAJE_MAXIMO;

  async function aplicar() {
    setEnviando(true);
    setError(null);
    const respuesta = await fetch('/api/complejo/precios', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ porcentaje, redondeo }),
    });
    const datos = await respuesta.json().catch(() => ({}));
    setEnviando(false);
    if (!respuesta.ok) {
      setError(datos.error ?? 'No pudimos actualizar los precios.');
      return;
    }
    setMensaje(`Listo: actualizamos ${datos.actualizadas} ${datos.actualizadas === 1 ? 'cancha' : 'canchas'}.`);
    setAbierto(false);
    refrescar(() => router.refresh());
  }

  return (
    <section className="tarjeta flex flex-col gap-3 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">Actualizar precios</p>
          <p className="text-xs text-tinta-3">Un aumento para todas las canchas de una, con redondeo.</p>
        </div>
        {!abierto ? (
          <button type="button" className="btn btn-secundario btn-sm shrink-0" onClick={() => { setAbierto(true); setMensaje(null); }}>
            Actualizar
          </button>
        ) : null}
      </div>
      {mensaje ? <p className="text-sm text-verde-txt" role="status">{mensaje}</p> : null}

      {abierto ? (
        <div className="flex flex-col gap-3 border-t border-borde pt-3">
          <div>
            <span className="rotulo-campo">Cuánto</span>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              {[5, 10, 15, 20].map((valor) => (
                <button
                  key={valor}
                  type="button"
                  aria-pressed={porcentaje === valor}
                  onClick={() => setPorcentaje(valor)}
                  className={porcentaje === valor ? 'chip-sel chip-sel-activo' : 'chip-sel'}
                >
                  +{valor}%
                </button>
              ))}
              <label className="flex items-center gap-1.5 text-sm">
                <input
                  type="number"
                  className="campo w-20 tabular"
                  aria-label="Otro porcentaje"
                  min={PORCENTAJE_MINIMO}
                  max={PORCENTAJE_MAXIMO}
                  value={porcentaje}
                  onChange={(evento) => setPorcentaje(Number(evento.target.value) || 0)}
                />
                %
              </label>
            </div>
          </div>
          <div>
            <span className="rotulo-campo">Redondear a</span>
            <div className="mt-1 flex flex-wrap gap-2">
              {REDONDEOS.map((valor) => (
                <button
                  key={valor}
                  type="button"
                  aria-pressed={redondeo === valor}
                  onClick={() => setRedondeo(valor)}
                  className={redondeo === valor ? 'chip-sel chip-sel-activo' : 'chip-sel'}
                >
                  {valor === 0 ? 'Sin redondear' : plata(valor)}
                </button>
              ))}
            </div>
          </div>
          <ul className="flex flex-col gap-1 text-[13px]">
            {conPrecio.map((cancha) => (
              <li key={cancha.id} className="flex justify-between gap-3 tabular">
                <span className="truncate text-tinta-2">{cancha.nombre}</span>
                <span className="shrink-0">
                  {cancha.precioPorHora != null ? (
                    <>
                      <span className="text-tinta-3 line-through">{plata(cancha.precioPorHora)}</span>{' '}
                      <span className="font-semibold">{valido ? plata(nuevoPrecio(cancha.precioPorHora, porcentaje, redondeo)) : '—'}</span>
                    </>
                  ) : null}
                  {cancha.precioPico != null ? (
                    <span className="text-naranja-txt">
                      {' '}· pico {valido ? plata(nuevoPrecio(cancha.precioPico, porcentaje, redondeo)) : '—'}
                    </span>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-tinta-3">Los turnos ya reservados mantienen su precio. Para bajar, poné un número negativo.</p>
          <div className="flex gap-2">
            <button type="button" className="btn btn-secundario btn-sm" disabled={!valido || enviando} onClick={aplicar}>
              {enviando ? 'Aplicando…' : `Aplicar a ${conPrecio.length} ${conPrecio.length === 1 ? 'cancha' : 'canchas'}`}
            </button>
            <button type="button" className="btn btn-fantasma btn-sm" onClick={() => setAbierto(false)}>
              Cancelar
            </button>
          </div>
        </div>
      ) : null}
      {error ? <p className="aviso-error">{error}</p> : null}
    </section>
  );
}
