'use client';

import { useState } from 'react';

/** Pantalla de entrada a staging: solo el PIN, nada del sitio. */
export function PantallaPin() {
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function entrar(evento: React.FormEvent) {
    evento.preventDefault();
    setEnviando(true);
    setError(null);
    const respuesta = await fetch('/api/staging/pin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin }),
    });
    const datos = await respuesta.json().catch(() => ({}));
    if (!respuesta.ok) {
      setEnviando(false);
      setPin('');
      setError(datos.error ?? 'No se pudo entrar.');
      return;
    }
    window.location.reload();
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xs flex-col justify-center gap-5 px-5">
      <div>
        <p className="t-rotulo text-naranja-txt">Sitio de pruebas</p>
        <h1 className="t-pantalla mt-1">Ingresá el PIN</h1>
        <p className="mt-1 text-sm text-tinta-2">Este es el ambiente de pruebas de birteam.</p>
      </div>
      <form onSubmit={entrar} className="flex flex-col gap-3">
        <input
          className="campo text-center text-[22px] tracking-[0.4em] tabular"
          value={pin}
          onChange={(evento) => setPin(evento.target.value.replace(/\D/g, '').slice(0, 8))}
          inputMode="numeric"
          autoComplete="one-time-code"
          autoFocus
          aria-label="PIN"
          aria-invalid={Boolean(error)}
        />
        {error ? <p className="aviso-error">{error}</p> : null}
        <button type="submit" className="btn btn-primario" disabled={enviando || pin.length < 4}>
          {enviando ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </main>
  );
}
