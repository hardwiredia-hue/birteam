'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { CuentaRegresiva } from '@/components/cuenta-regresiva';

export interface LugarLiberado {
  partidoId: string;
  titulo: string;
  lugar: string;
  hasta: string;
}

export interface InvitacionPendiente {
  partidoId: string;
  titulo: string;
  lugar: string;
  quien: string;
}

/**
 * Lo que espera una respuesta tuya: un lugar que se liberó (con su cuenta
 * regresiva de 2 h) y los partidos a los que te invitaron. Se responde
 * desde acá, sin entrar a cada partido.
 */
export function Pendientes({ liberados, invitaciones }: { liberados: LugarLiberado[]; invitaciones: InvitacionPendiente[] }) {
  const router = useRouter();
  const [pedido, setPedido] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [refrescando, refrescar] = useTransition();
  const [error, setError] = useState<string | null>(null);
  // "Confirmando…" hasta que la pantalla ya muestra lo nuevo, no solo hasta
  // que responde el servidor.
  const enviando = guardando || refrescando ? pedido : null;

  async function responder(partidoId: string, estado: 'VOY' | 'NOVOY') {
    setPedido(`${partidoId}-${estado}`);
    setGuardando(true);
    setError(null);
    const respuesta = await fetch(`/api/partidos/${partidoId}/rsvp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado }),
    });
    if (!respuesta.ok) {
      const datos = await respuesta.json().catch(() => ({}));
      setError(datos.error ?? 'No pudimos guardar tu respuesta. Probá de nuevo.');
    }
    refrescar(() => {
      setGuardando(false);
      router.refresh();
    });
  }

  if (liberados.length === 0 && invitaciones.length === 0) return null;

  return (
    <section className="flex flex-col gap-2">
      {error ? <p className="aviso-error">{error}</p> : null}

      {liberados.map((lugar) => (
        <div key={lugar.partidoId} className="tarjeta flex flex-col gap-3 p-4" style={{ borderColor: 'var(--azul-txt)' }}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="t-rotulo text-azul-txt">Lugar libre para vos</p>
              <Link href={`/partidos/${lugar.partidoId}`} className="mt-0.5 block truncate text-[15px] font-semibold">
                {lugar.titulo}
              </Link>
              <p className="truncate text-xs text-tinta-3">{lugar.lugar}</p>
            </div>
            <div className="shrink-0 text-right">
              <CuentaRegresiva hasta={lugar.hasta} alTerminar={() => router.refresh()} className="text-[18px] font-bold text-azul-txt" />
              <p className="text-[11px] text-tinta-3">para confirmar</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              className="btn btn-primario btn-sm flex-[2]"
              disabled={enviando !== null}
              onClick={() => responder(lugar.partidoId, 'VOY')}
            >
              {enviando === `${lugar.partidoId}-VOY` ? 'Confirmando…' : 'Confirmar lugar'}
            </button>
            <button
              type="button"
              className="btn btn-fantasma btn-sm flex-1"
              disabled={enviando !== null}
              onClick={() => responder(lugar.partidoId, 'NOVOY')}
            >
              No puedo
            </button>
          </div>
        </div>
      ))}

      {invitaciones.length > 0 ? (
        <div>
          <p className="t-rotulo mb-2">Te invitaron · {invitaciones.length}</p>
          <div className="tarjeta flex flex-col">
            {invitaciones.map((invitacion) => (
              <div key={invitacion.partidoId} className="flex items-center gap-3 border-b border-borde px-4 py-3 last:border-b-0">
                <Link href={`/partidos/${invitacion.partidoId}`} className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{invitacion.titulo}</span>
                  <span className="block truncate text-xs text-tinta-3">
                    {invitacion.lugar} · de {invitacion.quien}
                  </span>
                </Link>
                <button
                  type="button"
                  className="btn btn-secundario btn-sm"
                  disabled={enviando !== null}
                  onClick={() => responder(invitacion.partidoId, 'VOY')}
                >
                  {enviando === `${invitacion.partidoId}-VOY` ? '…' : 'Voy'}
                </button>
                <button
                  type="button"
                  className="text-xs font-semibold text-tinta-3 hover:text-tinta"
                  disabled={enviando !== null}
                  onClick={() => responder(invitacion.partidoId, 'NOVOY')}
                >
                  No voy
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
