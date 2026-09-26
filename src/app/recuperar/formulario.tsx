'use client';

import { useState } from 'react';

export function FormularioRecuperar() {
  const [enviado, setEnviado] = useState(false);
  const [enviando, setEnviando] = useState(false);

  async function alEnviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setEnviando(true);
    const form = new FormData(evento.currentTarget);
    await fetch('/api/auth/recuperar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: form.get('email') }),
    });
    setEnviando(false);
    setEnviado(true);
  }

  if (enviado) {
    return (
      <p className="aviso-ok mt-8">
        Si existe una cuenta con ese email, el link ya está en camino. Revisá también el correo no
        deseado. Vale por 1 hora.
      </p>
    );
  }

  return (
    <form onSubmit={alEnviar} className="mt-8 flex flex-col gap-4">
      <div>
        <label className="rotulo-campo" htmlFor="email">Tu email</label>
        <input id="email" name="email" type="email" className="campo" autoComplete="email" required />
      </div>
      <button type="submit" className="btn btn-primario" disabled={enviando}>
        {enviando ? 'Enviando…' : 'Mandame el link'}
      </button>
    </form>
  );
}
