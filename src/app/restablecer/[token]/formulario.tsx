'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function FormularioRestablecer({ token }: { token: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [listo, setListo] = useState(false);

  async function alEnviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setEnviando(true);
    setError(null);
    const form = new FormData(evento.currentTarget);
    const respuesta = await fetch('/api/auth/restablecer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, clave: form.get('clave') }),
    });
    const datos = await respuesta.json().catch(() => ({}));
    setEnviando(false);
    if (!respuesta.ok) {
      setError(datos.error ?? 'No pudimos cambiar la contraseña.');
      return;
    }
    setListo(true);
    setTimeout(() => {
      router.push('/entrar');
    }, 1500);
  }

  if (listo) {
    return <p className="aviso-ok mt-8">Contraseña cambiada. Te llevamos a entrar…</p>;
  }

  return (
    <form onSubmit={alEnviar} className="mt-8 flex flex-col gap-4">
      <div>
        <label className="rotulo-campo" htmlFor="clave">Nueva contraseña</label>
        <input
          id="clave"
          name="clave"
          type="password"
          className="campo"
          minLength={8}
          placeholder="Mínimo 8 caracteres"
          autoComplete="new-password"
          required
        />
      </div>
      {error ? <p className="aviso-error">{error}</p> : null}
      <button type="submit" className="btn btn-primario" disabled={enviando}>
        {enviando ? 'Cambiando…' : 'Cambiar la contraseña'}
      </button>
    </form>
  );
}
