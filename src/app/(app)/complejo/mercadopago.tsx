'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function DesconectarMercadoPago() {
  const router = useRouter();
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function desconectar() {
    if (!window.confirm('¿Desconectar Mercado Pago? Tus canchas dejan de cobrar online.')) return;
    setEnviando(true);
    setError(null);
    const respuesta = await fetch('/api/mercadopago/desconectar', { method: 'POST' });
    const datos = await respuesta.json().catch(() => ({}));
    setEnviando(false);
    if (!respuesta.ok) {
      setError(datos.error ?? 'No pudimos desconectarla.');
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-2">
      <button type="button" className="btn btn-fantasma btn-sm self-start" disabled={enviando} onClick={desconectar}>
        Desconectar
      </button>
      {error ? <p className="aviso-error">{error}</p> : null}
    </div>
  );
}
