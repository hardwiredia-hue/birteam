'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function FormularioTorneo({ deportes }: { deportes: { id: string; nombre: string }[] }) {
  const router = useRouter();
  const [deporteId, setDeporteId] = useState<string | null>(null);
  const [errores, setErrores] = useState<Record<string, string[]>>({});
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function alEnviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setEnviando(true);
    setError(null);
    setErrores({});

    const form = new FormData(evento.currentTarget);
    const respuesta = await fetch('/api/torneos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre: form.get('nombre'),
        deporteId,
        maxEquipos: Number(form.get('maxEquipos')),
        descripcion: form.get('descripcion') || null,
      }),
    });
    const datos = await respuesta.json().catch(() => ({}));
    setEnviando(false);
    if (!respuesta.ok) {
      setError(datos.error ?? 'No pudimos crear el torneo.');
      if (datos.detalles) setErrores(datos.detalles);
      return;
    }
    router.push(`/torneos/${datos.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={alEnviar} className="flex flex-col gap-4">
      <div>
        <label className="rotulo-campo" htmlFor="nombre">Nombre del torneo</label>
        <input id="nombre" name="nombre" className="campo" placeholder="Liga de los Jueves" required />
        {errores.nombre ? <p className="mt-1 text-xs text-rojo">{errores.nombre[0]}</p> : null}
      </div>

      <div>
        <span className="rotulo-campo">Deporte</span>
        <div className="flex flex-wrap gap-2">
          {deportes.map((deporte) => (
            <button
              key={deporte.id}
              type="button"
              onClick={() => setDeporteId(deporte.id)}
              className={deporteId === deporte.id ? 'chip-sel chip-sel-activo' : 'chip-sel'}
            >
              {deporte.nombre}
            </button>
          ))}
        </div>
        {errores.deporteId ? <p className="mt-1 text-xs text-rojo">{errores.deporteId[0]}</p> : null}
      </div>

      <div>
        <label className="rotulo-campo" htmlFor="maxEquipos">Cupo de equipos</label>
        <input
          id="maxEquipos"
          name="maxEquipos"
          type="number"
          min={2}
          max={24}
          defaultValue={8}
          className="campo tabular"
        />
        {errores.maxEquipos ? <p className="mt-1 text-xs text-rojo">{errores.maxEquipos[0]}</p> : null}
      </div>

      <div>
        <label className="rotulo-campo" htmlFor="descripcion">Descripción · opcional</label>
        <textarea
          id="descripcion"
          name="descripcion"
          className="campo min-h-20 resize-y"
          placeholder="Dónde se juega, qué días, premio, reglas."
        />
      </div>

      {error ? <p className="aviso-error">{error}</p> : null}

      <button type="submit" className="btn btn-primario" disabled={enviando || !deporteId}>
        {enviando ? 'Creando…' : 'Crear el torneo'}
      </button>
    </form>
  );
}
