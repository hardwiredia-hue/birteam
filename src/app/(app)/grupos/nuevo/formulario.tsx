'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface Deporte {
  id: string;
  nombre: string;
}

export function FormularioGrupo({ deportes }: { deportes: Deporte[] }) {
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
    const respuesta = await fetch('/api/grupos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre: form.get('nombre'),
        deporteId,
        descripcion: form.get('descripcion') || null,
      }),
    });

    const datos = await respuesta.json().catch(() => ({}));
    if (!respuesta.ok) {
      setError(datos.error ?? 'No pudimos crear el grupo.');
      if (datos.detalles) setErrores(datos.detalles);
      setEnviando(false);
      return;
    }
    router.push(`/grupos/${datos.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={alEnviar} className="flex flex-col gap-4">
      <div>
        <label className="rotulo-campo" htmlFor="nombre">Nombre del grupo</label>
        <input id="nombre" name="nombre" className="campo" placeholder="Fútbol de los jueves" required />
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
        <label className="rotulo-campo" htmlFor="descripcion">Descripción · opcional</label>
        <textarea
          id="descripcion"
          name="descripcion"
          className="campo min-h-20 resize-y"
          placeholder="Jugamos todos los jueves 21 hs en Palermo. Buena onda ante todo."
        />
      </div>

      {error ? <p className="aviso-error">{error}</p> : null}

      <button type="submit" className="btn btn-primario" disabled={enviando || !deporteId}>
        {enviando ? 'Creando…' : 'Crear el grupo'}
      </button>
    </form>
  );
}
