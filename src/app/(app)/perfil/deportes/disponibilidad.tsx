'use client';

import { EnlaceAyuda } from '@/components/ayuda';
import { useState } from 'react';
import { DIAS_DISPONIBILIDAD, FRANJAS, clave } from '@/lib/disponibilidad';

/**
 * "¿Cuándo podés jugar?": una grilla de días por franja. Se guarda sola en
 * cada toque. Sirve para que los avisos de "faltan jugadores" te lleguen
 * cuando podés ir.
 */
export function EditorDisponibilidad({ inicial }: { inicial: string[] }) {
  const [elegidas, setElegidas] = useState<string[]>(inicial);
  const [estado, setEstado] = useState<'listo' | 'guardando' | 'error' | null>(null);

  async function alternar(valor: string) {
    const nuevas = elegidas.includes(valor) ? elegidas.filter((c) => c !== valor) : [...elegidas, valor];
    const anteriores = elegidas;
    setElegidas(nuevas);
    setEstado('guardando');
    const respuesta = await fetch('/api/perfil/disponibilidad', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ claves: nuevas }),
    });
    if (!respuesta.ok) {
      setElegidas(anteriores);
      setEstado('error');
      return;
    }
    setEstado('listo');
  }

  return (
    <section className="tarjeta flex flex-col gap-3 p-4">
      <div>
        <p className="text-sm font-semibold">¿Cuándo podés jugar?</p>
        <p className="text-xs text-tinta-3">
          Los avisos de partidos que buscan jugadores te llegan en estos horarios. Si no marcás nada, te llegan todos.
        </p>
        <EnlaceAyuda tema="primeros-pasos" articulo="perfil-deportivo" className="mt-1" />
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr>
            <th scope="col" className="w-12" />
            {FRANJAS.map((f) => (
              <th key={f.valor} scope="col" className="t-rotulo pb-1 text-center font-normal">
                {f.rotulo}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {DIAS_DISPONIBILIDAD.map((d) => (
            <tr key={d.dia}>
              <th scope="row" className="py-1 text-left font-semibold text-tinta-2">
                {d.rotulo}
              </th>
              {FRANJAS.map((f) => {
                const valor = clave(d.dia, f.valor);
                const marcada = elegidas.includes(valor);
                return (
                  <td key={f.valor} className="p-1 text-center">
                    <button
                      type="button"
                      aria-pressed={marcada}
                      aria-label={`${d.rotulo} ${f.rotulo.toLowerCase()}`}
                      onClick={() => alternar(valor)}
                      className={`h-9 w-full rounded-[6px] border text-xs font-semibold ${
                        marcada ? 'border-verde-txt bg-verde text-[#0b0d03]' : 'border-borde text-tinta-3'
                      }`}
                    >
                      {marcada ? 'Puedo' : '—'}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-xs text-tinta-3" role="status">
        {estado === 'guardando'
          ? 'Guardando…'
          : estado === 'error'
            ? 'No pudimos guardar. Probá de nuevo.'
            : estado === 'listo'
              ? 'Guardado.'
              : 'Mañana: 6 a 12 · Tarde: 12 a 18 · Noche: desde las 18.'}
      </p>
    </section>
  );
}
