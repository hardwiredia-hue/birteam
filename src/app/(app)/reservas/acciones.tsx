'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

/** Botones de una reserva en la lista: según quién mira y en qué estado está. */
export function AccionesReserva({
  reservaId,
  estado,
  esDueno,
  armarPartido,
  cancelable = true,
}: {
  reservaId: string;
  estado: string;
  esDueno: boolean;
  /** Link al asistente con la cancha, el día y la hora ya puestos. */
  armarPartido?: string | null;
  /** Falso cuando el turno confirmado está demasiado cerca para cancelarlo online. */
  cancelable?: boolean;
}) {
  const router = useRouter();
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function hacer(accion: 'confirmar' | 'rechazar' | 'cancelar') {
    let motivo: string | null = null;
    if (accion !== 'confirmar' && estado !== 'BLOQUEO') {
      const respuesta = window.prompt(
        accion === 'rechazar' ? 'Motivo del rechazo (opcional):' : 'Motivo (opcional):',
        ''
      );
      if (respuesta === null) return;
      motivo = respuesta.trim() || null;
    }
    setEnviando(true);
    setError(null);
    const respuesta = await fetch(`/api/reservas/${reservaId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accion, motivo }),
    });
    const datos = await respuesta.json().catch(() => ({}));
    setEnviando(false);
    if (!respuesta.ok) setError(datos.error ?? 'No pudimos hacer el cambio.');
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {esDueno && estado === 'SOLICITADA' ? (
          <>
            <button type="button" className="btn btn-primario btn-sm" disabled={enviando} onClick={() => hacer('confirmar')}>
              Confirmar
            </button>
            <button type="button" className="btn btn-secundario btn-sm" disabled={enviando} onClick={() => hacer('rechazar')}>
              Rechazar
            </button>
          </>
        ) : null}
        {!esDueno && estado === 'CONFIRMADA' && armarPartido ? (
          <Link href={armarPartido} className="btn btn-primario btn-sm">
            Armar el partido
          </Link>
        ) : null}
        {(esDueno && ['CONFIRMADA', 'BLOQUEO'].includes(estado)) ||
        (!esDueno && cancelable && ['SOLICITADA', 'PENDIENTE_PAGO', 'CONFIRMADA'].includes(estado)) ? (
          <button type="button" className="btn btn-secundario btn-sm" disabled={enviando} onClick={() => hacer('cancelar')}>
            {estado === 'BLOQUEO'
              ? 'Liberar'
              : estado === 'SOLICITADA' || estado === 'PENDIENTE_PAGO'
                ? 'Cancelar el pedido'
                : 'Cancelar'}
          </button>
        ) : null}
      </div>
      {!esDueno && !cancelable && estado === 'CONFIRMADA' ? (
        <p className="text-xs text-tinta-3">Falta poco: para cancelar, llamá al complejo.</p>
      ) : null}
      {error ? <p className="aviso-error">{error}</p> : null}
    </div>
  );
}
