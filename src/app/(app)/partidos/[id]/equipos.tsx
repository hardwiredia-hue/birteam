'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Compartir } from '@/components/compartir';
import { NOMBRES_EQUIPO } from '@/lib/equipos';

interface Jugador {
  usuarioId: string;
  nombre: string;
  equipo: number | null;
}

/**
 * Equipos del partido. Quien organiza los arma (parejos por nivel o al
 * azar) y toca un nombre para pasarlo al otro lado; todos los ven.
 */
export function Equipos({
  partidoId,
  organiza,
  jugadores,
  rutaPublica,
  cuando,
}: {
  partidoId: string;
  organiza: boolean;
  jugadores: Jugador[];
  rutaPublica: string;
  /** "jueves 21:00", para el mensaje al compartir. */
  cuando: string;
}) {
  const router = useRouter();
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lado = (equipo: number) => jugadores.filter((j) => j.equipo === equipo);
  const sinEquipo = jugadores.filter((j) => j.equipo !== 1 && j.equipo !== 2);
  const armados = lado(1).length + lado(2).length > 0;

  async function pedir(metodo: 'POST' | 'PATCH' | 'DELETE', cuerpo?: object) {
    setEnviando(true);
    setError(null);
    const respuesta = await fetch(`/api/partidos/${partidoId}/equipos`, {
      method: metodo,
      headers: { 'Content-Type': 'application/json' },
      body: cuerpo ? JSON.stringify(cuerpo) : undefined,
    });
    const datos = await respuesta.json().catch(() => ({}));
    setEnviando(false);
    if (!respuesta.ok) setError(datos.error ?? 'No se pudo.');
    router.refresh();
  }

  function mover(jugador: Jugador) {
    // Sin equipo: al lado que tiene menos; con equipo: al otro.
    const destino = jugador.equipo === 1 ? 2 : jugador.equipo === 2 ? 1 : lado(1).length <= lado(2).length ? 1 : 2;
    pedir('PATCH', { usuarioId: jugador.usuarioId, equipo: destino });
  }

  if (!armados && !organiza) return null;
  const texto = [
    `Equipos para el ${cuando}`,
    `${NOMBRES_EQUIPO[1]}: ${lado(1).map((j) => j.nombre.split(' ')[0]).join(', ')}`,
    `${NOMBRES_EQUIPO[2]}: ${lado(2).map((j) => j.nombre.split(' ')[0]).join(', ')}`,
  ].join('\n');

  return (
    <section className="tarjeta flex flex-col gap-3 p-4">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm font-semibold">Equipos</p>
        {organiza && armados ? (
          <button type="button" className="text-xs font-semibold text-tinta-3" onClick={() => pedir('DELETE')} disabled={enviando}>
            Deshacer
          </button>
        ) : null}
      </div>

      {armados ? (
        <div className="grid grid-cols-2 gap-3">
          {[1, 2].map((equipo) => (
            <div key={equipo} className="flex flex-col gap-1.5">
              <p className="t-rotulo flex items-center gap-1.5">
                <span
                  className="h-2.5 w-2.5 rounded-[3px]"
                  style={equipo === 1 ? { background: 'var(--verde)' } : { border: '1.5px solid var(--tinta-3)' }}
                />
                {NOMBRES_EQUIPO[equipo]} · {lado(equipo).length}
              </p>
              {lado(equipo).map((jugador) =>
                organiza ? (
                  <button
                    key={jugador.usuarioId}
                    type="button"
                    onClick={() => mover(jugador)}
                    disabled={enviando}
                    className="truncate rounded-[6px] border border-borde px-2.5 py-1.5 text-left text-sm hover:border-borde-2"
                    title="Pasar al otro equipo"
                  >
                    {jugador.nombre}
                  </button>
                ) : (
                  <p key={jugador.usuarioId} className="truncate px-0.5 py-1 text-sm">
                    {jugador.nombre}
                  </p>
                )
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-tinta-3">
          Repartí a los confirmados en dos equipos. Parejos usa el nivel que cada uno cargó en su perfil.
        </p>
      )}

      {organiza && sinEquipo.length > 0 && armados ? (
        <div className="flex flex-col gap-1.5">
          <p className="text-xs text-tinta-3">Confirmaron después: tocá para sumarlos.</p>
          <div className="flex flex-wrap gap-1.5">
            {sinEquipo.map((jugador) => (
              <button key={jugador.usuarioId} type="button" className="chip-sel py-1.5 text-[11px]" onClick={() => mover(jugador)} disabled={enviando}>
                + {jugador.nombre.split(' ')[0]}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {organiza ? (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="btn btn-secundario btn-sm"
            disabled={enviando || jugadores.length < 2}
            onClick={() => pedir('POST', { modo: 'parejos' })}
          >
            {armados ? 'Rearmar parejos' : 'Armar parejos'}
          </button>
          <button
            type="button"
            className="btn btn-fantasma btn-sm"
            disabled={enviando || jugadores.length < 2}
            onClick={() => pedir('POST', { modo: 'mezclar' })}
          >
            Mezclar
          </button>
          {armados ? (
            <Compartir
              ruta={rutaPublica}
              texto={texto}
              titulo="Mandar los equipos"
              className="btn btn-fantasma btn-sm"
              etiqueta="Mandar los equipos"
            />
          ) : null}
        </div>
      ) : null}
      {organiza && armados ? <p className="text-xs text-tinta-3">Tocá un nombre para pasarlo al otro equipo.</p> : null}
      {error ? <p className="aviso-error">{error}</p> : null}
    </section>
  );
}
