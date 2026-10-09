'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  MAX_DEPORTES_USUARIO,
  NIVELES,
  POSICIONES_POR_DEPORTE,
  ROTULOS_NIVEL,
} from '@/lib/constantes';

interface Eleccion {
  deporteId: string;
  principal: boolean;
  posicion: string | null;
  nivel: string | null;
}

export function EditorDeportes({
  deportes,
  inicial,
}: {
  deportes: { id: string; nombre: string }[];
  inicial: Eleccion[];
}) {
  const router = useRouter();
  const [elegidos, setElegidos] = useState<Eleccion[]>(inicial);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [listo, setListo] = useState(false);

  const nombreDe = (id: string) => deportes.find((d) => d.id === id)?.nombre ?? '';

  function alternar(deporteId: string) {
    setListo(false);
    setElegidos((actuales) => {
      if (actuales.some((e) => e.deporteId === deporteId)) {
        const restantes = actuales.filter((e) => e.deporteId !== deporteId);
        // Si se fue el principal, pasa a serlo el primero que queda.
        if (restantes.length > 0 && !restantes.some((e) => e.principal)) {
          restantes[0] = { ...restantes[0], principal: true };
        }
        return restantes;
      }
      if (actuales.length >= MAX_DEPORTES_USUARIO) return actuales;
      return [
        ...actuales,
        { deporteId, principal: actuales.length === 0, posicion: null, nivel: null },
      ];
    });
  }

  function cambiar(deporteId: string, cambios: Partial<Eleccion>) {
    setListo(false);
    setElegidos((actuales) =>
      actuales.map((e) =>
        cambios.principal
          ? { ...e, principal: e.deporteId === deporteId, ...(e.deporteId === deporteId ? cambios : {}) }
          : e.deporteId === deporteId
            ? { ...e, ...cambios }
            : e
      )
    );
  }

  async function guardar() {
    setEnviando(true);
    setError(null);
    const respuesta = await fetch('/api/perfil/deportes', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deportes: elegidos }),
    });
    const datos = await respuesta.json().catch(() => ({}));
    setEnviando(false);
    if (!respuesta.ok) {
      setError(datos.error ?? 'No pudimos guardar.');
      return;
    }
    setListo(true);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <span className="rotulo-campo">
          Tus deportes · hasta {MAX_DEPORTES_USUARIO} ({elegidos.length} elegidos)
        </span>
        <div className="mt-1 flex flex-wrap gap-2">
          {deportes.map((deporte) => {
            const activo = elegidos.some((e) => e.deporteId === deporte.id);
            return (
              <button
                key={deporte.id}
                type="button"
                onClick={() => alternar(deporte.id)}
                disabled={!activo && elegidos.length >= MAX_DEPORTES_USUARIO}
                className={activo ? 'chip-sel chip-sel-activo' : 'chip-sel'}
              >
                {deporte.nombre}
              </button>
            );
          })}
        </div>
      </div>

      {elegidos.map((eleccion) => {
        const nombre = nombreDe(eleccion.deporteId);
        const sugeridas = POSICIONES_POR_DEPORTE[nombre] ?? [];
        return (
          <section key={eleccion.deporteId} className="tarjeta flex flex-col gap-3 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="t-display text-[18px]">{nombre}</p>
              <button
                type="button"
                onClick={() => cambiar(eleccion.deporteId, { principal: true })}
                className="text-xs font-semibold"
                style={{ color: eleccion.principal ? 'var(--verde-txt)' : 'var(--tinta-3)' }}
              >
                {eleccion.principal ? '★ Principal' : '☆ Hacer principal'}
              </button>
            </div>

            <div>
              <span className="rotulo-campo">Nivel</span>
              <div className="mt-1 flex flex-wrap gap-2">
                {NIVELES.map((nivel) => (
                  <button
                    key={nivel}
                    type="button"
                    onClick={() =>
                      cambiar(eleccion.deporteId, { nivel: eleccion.nivel === nivel ? null : nivel })
                    }
                    className={eleccion.nivel === nivel ? 'chip-sel chip-sel-activo' : 'chip-sel'}
                  >
                    {ROTULOS_NIVEL[nivel]}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="rotulo-campo">Posición</span>
              {sugeridas.length > 0 ? (
                <div className="mt-1 flex flex-wrap gap-2">
                  {sugeridas.map((posicion) => (
                    <button
                      key={posicion}
                      type="button"
                      onClick={() =>
                        cambiar(eleccion.deporteId, {
                          posicion: eleccion.posicion === posicion ? null : posicion,
                        })
                      }
                      className={eleccion.posicion === posicion ? 'chip-sel chip-sel-activo' : 'chip-sel'}
                    >
                      {posicion}
                    </button>
                  ))}
                </div>
              ) : null}
              <input
                className="campo mt-2"
                value={eleccion.posicion ?? ''}
                maxLength={40}
                onChange={(evento) =>
                  cambiar(eleccion.deporteId, { posicion: evento.target.value || null })
                }
                placeholder={sugeridas.length > 0 ? 'U otra, escribila' : 'Ej: fondista, sprinter…'}
              />
            </div>
          </section>
        );
      })}

      {error ? <p className="aviso-error">{error}</p> : null}
      {listo ? <p className="aviso-ok">Perfil deportivo guardado.</p> : null}

      <button type="button" className="btn btn-primario" disabled={enviando} onClick={guardar}>
        {enviando ? 'Guardando…' : 'Guardar'}
      </button>
    </div>
  );
}
