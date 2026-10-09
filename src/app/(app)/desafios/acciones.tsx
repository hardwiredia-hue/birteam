'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

/** Aceptar / rechazar / cancelar un desafío, según quién mira. */
export function AccionesDesafio({
  desafioId,
  puedoCancelar,
  gruposParaAceptar,
  dirigido,
}: {
  desafioId: string;
  puedoCancelar: boolean;
  /** Grupos (que administro) con los que puedo aceptar; vacío = no puedo responder. */
  gruposParaAceptar: { id: string; nombre: string }[];
  dirigido: boolean;
}) {
  const router = useRouter();
  const [grupoId, setGrupoId] = useState(gruposParaAceptar[0]?.id ?? '');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [partidoId, setPartidoId] = useState<string | null>(null);

  async function hacer(accion: 'aceptar' | 'rechazar' | 'cancelar') {
    if (accion === 'cancelar' && !window.confirm('¿Cancelar el desafío?')) return;
    setEnviando(true);
    setError(null);
    const respuesta = await fetch(`/api/desafios/${desafioId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accion, grupoId: dirigido ? null : grupoId }),
    });
    const datos = await respuesta.json().catch(() => ({}));
    setEnviando(false);
    if (!respuesta.ok) {
      setError(datos.error ?? 'No pudimos hacer el cambio.');
      router.refresh();
      return;
    }
    if (datos.partidoId) setPartidoId(datos.partidoId);
    router.refresh();
  }

  if (partidoId) {
    return (
      <Link href={`/partidos/${partidoId}`} className="btn btn-primario btn-sm self-start">
        ¡Aceptado! Ver el partido
      </Link>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {gruposParaAceptar.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          {!dirigido && gruposParaAceptar.length > 1 ? (
            <select className="campo w-auto" value={grupoId} onChange={(evento) => setGrupoId(evento.target.value)}>
              {gruposParaAceptar.map((grupo) => (
                <option key={grupo.id} value={grupo.id}>
                  Con {grupo.nombre}
                </option>
              ))}
            </select>
          ) : null}
          <button type="button" className="btn btn-primario btn-sm" disabled={enviando} onClick={() => hacer('aceptar')}>
            {dirigido
              ? 'Aceptar'
              : gruposParaAceptar.length === 1
                ? `Aceptar con ${gruposParaAceptar[0].nombre}`
                : 'Aceptar'}
          </button>
          {dirigido ? (
            <button type="button" className="btn btn-secundario btn-sm" disabled={enviando} onClick={() => hacer('rechazar')}>
              Rechazar
            </button>
          ) : null}
        </div>
      ) : null}
      {puedoCancelar ? (
        <button type="button" className="btn btn-fantasma btn-sm self-start" disabled={enviando} onClick={() => hacer('cancelar')}>
          Cancelar el desafío
        </button>
      ) : null}
      {error ? <p className="aviso-error">{error}</p> : null}
    </div>
  );
}
