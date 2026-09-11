'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function FormularioEntrar() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function alEnviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setEnviando(true);
    setError(null);

    const form = new FormData(evento.currentTarget);
    const respuesta = await fetch('/api/auth/entrar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        usuarioOEmail: form.get('usuarioOEmail'),
        clave: form.get('clave'),
      }),
    });

    if (!respuesta.ok) {
      const datos = await respuesta.json().catch(() => ({}));
      setError(datos.error ?? 'No pudimos iniciar la sesión. Probá de nuevo.');
      setEnviando(false);
      return;
    }

    router.push('/panel');
    router.refresh();
  }

  return (
    <form onSubmit={alEnviar} className="mt-8 flex flex-col gap-4">
      <div>
        <label className="rotulo-campo" htmlFor="usuarioOEmail">
          Usuario o email
        </label>
        <input id="usuarioOEmail" name="usuarioOEmail" className="campo" autoComplete="username" required />
      </div>
      <div>
        <label className="rotulo-campo" htmlFor="clave">
          Contraseña
        </label>
        <input id="clave" name="clave" type="password" className="campo" autoComplete="current-password" required />
      </div>

      {error ? <p className="aviso-error">{error}</p> : null}

      <button type="submit" className="btn btn-primario mt-2" disabled={enviando}>
        {enviando ? 'Entrando…' : 'Entrar'}
      </button>
    </form>
  );
}
