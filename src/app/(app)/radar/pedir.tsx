'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

/** Pedir un turno del Radar sin salir de la lista. */
export function PedirOferta({ canchaId, fecha, hora }: { canchaId: string; fecha: string; hora: string }) {
  const router = useRouter();
  const [estado, setEstado] = useState<'listo' | 'enviando' | 'pedido'>('listo');
  const [error, setError] = useState<string | null>(null);

  async function pedir() {
    setEstado('enviando');
    setError(null);
    const respuesta = await fetch(`/api/canchas/${canchaId}/reservas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fecha, hora }),
    });
    const datos = await respuesta.json().catch(() => ({}));
    if (!respuesta.ok) {
      setError(datos.error ?? 'No pudimos pedir el turno.');
      setEstado('listo');
      router.refresh();
      return;
    }
    setEstado('pedido');
  }

  if (estado === 'pedido') {
    return <p className="aviso-ok">Pedido enviado. Te avisamos cuando el complejo confirme.</p>;
  }
  return (
    <div className="flex flex-col gap-2">
      <button type="button" className="btn btn-primario btn-sm" disabled={estado === 'enviando'} onClick={pedir}>
        {estado === 'enviando' ? 'Pidiendo…' : 'Pedir este turno'}
      </button>
      {error ? <p className="aviso-error">{error}</p> : null}
    </div>
  );
}
