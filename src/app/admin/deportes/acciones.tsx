'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function AltaDeporte() {
  const router = useRouter();
  const [nombre, setNombre] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function agregar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!nombre.trim()) return;
    setEnviando(true);
    setError(null);
    const respuesta = await fetch('/api/admin/deportes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre: nombre.trim() }),
    });
    setEnviando(false);
    if (!respuesta.ok) {
      const datos = await respuesta.json().catch(() => ({}));
      setError(datos.error ?? 'No pudimos agregarlo.');
      return;
    }
    setNombre('');
    router.refresh();
  }

  return (
    <form onSubmit={agregar} className="flex flex-col gap-2">
      <div className="flex gap-2">
        <input
          id="nuevo-deporte"
          className="campo"
          placeholder="Agregar deporte… (ej. Pádel americano)"
          value={nombre}
          onChange={(evento) => setNombre(evento.target.value)}
        />
        <button type="submit" className="btn btn-primario btn-sm" disabled={enviando || !nombre.trim()}>
          {enviando ? '…' : 'Agregar'}
        </button>
      </div>
      {error ? <p className="aviso-error">{error}</p> : null}
    </form>
  );
}
