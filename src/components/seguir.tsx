'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function BotonSeguir({
  usuarioId,
  siguiendoInicial,
}: {
  usuarioId: string;
  siguiendoInicial: boolean;
}) {
  const router = useRouter();
  const [siguiendo, setSiguiendo] = useState(siguiendoInicial);
  const [enviando, setEnviando] = useState(false);

  async function alternar() {
    setEnviando(true);
    const respuesta = await fetch('/api/seguir', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usuarioId, accion: siguiendo ? 'dejar' : 'seguir' }),
    });
    if (respuesta.ok) {
      const datos = await respuesta.json();
      setSiguiendo(datos.siguiendo);
    }
    setEnviando(false);
    router.refresh();
  }

  return (
    <button
      type="button"
      className={siguiendo ? 'btn btn-secundario btn-sm' : 'btn btn-primario btn-sm'}
      onClick={alternar}
      disabled={enviando}
    >
      {enviando ? '…' : siguiendo ? 'Siguiendo ✓' : 'Seguir'}
    </button>
  );
}
