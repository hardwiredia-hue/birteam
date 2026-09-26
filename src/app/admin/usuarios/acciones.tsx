'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function BotonRol({ usuarioId, esAdmin }: { usuarioId: string; esAdmin: boolean }) {
  const router = useRouter();
  const [enviando, setEnviando] = useState(false);

  async function cambiar() {
    setEnviando(true);
    await fetch('/api/admin/usuarios', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usuarioId, rol: esAdmin ? 'USUARIO' : 'ADMIN' }),
    });
    setEnviando(false);
    router.refresh();
  }

  return (
    <button type="button" className="btn btn-secundario btn-sm" onClick={cambiar} disabled={enviando}>
      {enviando ? '…' : esAdmin ? 'Quitar admin' : 'Hacer admin'}
    </button>
  );
}
