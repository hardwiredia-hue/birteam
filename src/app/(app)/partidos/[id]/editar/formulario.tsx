'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function FormularioEditarPartido({
  partidoId,
  confirmados,
  inicial,
}: {
  partidoId: string;
  confirmados: number;
  inicial: {
    fecha: string;
    lugarNombre: string;
    direccion: string | null;
    cupo: number;
    minimo: number;
    costoPorJugador: number | null;
    visibilidad: string;
    recurrenteSemanal: boolean;
  };
}) {
  const router = useRouter();
  const [errores, setErrores] = useState<Record<string, string[]>>({});
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function alEnviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setEnviando(true);
    setError(null);
    setErrores({});

    const form = new FormData(evento.currentTarget);
    // El datetime-local viene en hora argentina.
    const fechaLocal = String(form.get('fecha') ?? '');
    const fecha = new Date(`${fechaLocal}:00-03:00`);

    const respuesta = await fetch(`/api/partidos/${partidoId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fecha: fecha.toISOString(),
        lugarNombre: form.get('lugarNombre'),
        direccion: form.get('direccion') || null,
        cupo: Number(form.get('cupo')),
        minimo: Number(form.get('minimo')),
        costoPorJugador: String(form.get('costoPorJugador') ?? '').trim()
          ? Number(form.get('costoPorJugador'))
          : null,
        visibilidad: form.get('visibilidad'),
        recurrenteSemanal: form.get('recurrenteSemanal') === 'on',
      }),
    });
    const datos = await respuesta.json().catch(() => ({}));
    setEnviando(false);
    if (!respuesta.ok) {
      setError(datos.error ?? 'No pudimos guardar los cambios.');
      if (datos.detalles) setErrores(datos.detalles);
      return;
    }
    router.push(`/partidos/${partidoId}`);
    router.refresh();
  }

  return (
    <form onSubmit={alEnviar} className="flex flex-col gap-4">
      <div>
        <label className="rotulo-campo" htmlFor="fecha">Día y hora</label>
        <input id="fecha" name="fecha" type="datetime-local" className="campo tabular" defaultValue={inicial.fecha} required />
        {errores.fecha ? <p className="mt-1 text-xs text-rojo">{errores.fecha[0]}</p> : null}
      </div>

      <div>
        <label className="rotulo-campo" htmlFor="lugarNombre">Cancha o lugar</label>
        <input id="lugarNombre" name="lugarNombre" className="campo" defaultValue={inicial.lugarNombre} required />
      </div>

      <div>
        <label className="rotulo-campo" htmlFor="direccion">Dirección · opcional</label>
        <input id="direccion" name="direccion" className="campo" defaultValue={inicial.direccion ?? ''} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="rotulo-campo" htmlFor="cupo">Cupo</label>
          <input id="cupo" name="cupo" type="number" min={Math.max(2, confirmados)} max={200} className="campo tabular" defaultValue={inicial.cupo} />
          {errores.cupo ? <p className="mt-1 text-xs text-rojo">{errores.cupo[0]}</p> : null}
          {confirmados > 0 ? (
            <p className="mt-1 text-xs text-tinta-3">Ya hay {confirmados} confirmados.</p>
          ) : null}
        </div>
        <div>
          <label className="rotulo-campo" htmlFor="minimo">Mínimo</label>
          <input id="minimo" name="minimo" type="number" min={2} max={200} className="campo tabular" defaultValue={inicial.minimo} />
          {errores.minimo ? <p className="mt-1 text-xs text-rojo">{errores.minimo[0]}</p> : null}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="rotulo-campo" htmlFor="costoPorJugador">Costo por jugador</label>
          <input
            id="costoPorJugador"
            name="costoPorJugador"
            type="number"
            min={0}
            step={100}
            className="campo tabular"
            defaultValue={inicial.costoPorJugador ?? ''}
            placeholder="Gratis"
          />
        </div>
        <div>
          <label className="rotulo-campo" htmlFor="visibilidad">Quién lo ve</label>
          <select id="visibilidad" name="visibilidad" className="campo" defaultValue={inicial.visibilidad}>
            <option value="ABIERTO">Abierto a cercanos</option>
            <option value="GRUPO">Privado (solo con link)</option>
          </select>
        </div>
      </div>

      <label className="flex items-center gap-2.5 text-sm">
        <input type="checkbox" name="recurrenteSemanal" defaultChecked={inicial.recurrenteSemanal} className="accent-[#a8e617]" />
        Se repite todas las semanas
      </label>

      {error ? <p className="aviso-error">{error}</p> : null}

      <div className="grid grid-cols-2 gap-2">
        <a href={`/partidos/${partidoId}`} className="btn btn-fantasma">Cancelar</a>
        <button type="submit" className="btn btn-primario" disabled={enviando}>
          {enviando ? 'Guardando…' : 'Guardar cambios'}
        </button>
      </div>
    </form>
  );
}
