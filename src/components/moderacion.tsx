'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { MOTIVOS_DENUNCIA } from '@/lib/constantes';

/**
 * Reportar (usuario o partido) y Bloquear (solo usuario), juntos porque
 * siempre van juntos. Discretos: dos links chicos que abren el panel.
 */
export function Moderacion({
  denunciadoId,
  partidoId,
  bloqueado,
}: {
  denunciadoId?: string;
  partidoId?: string;
  /** Solo para usuarios: si ya lo tengo bloqueado. */
  bloqueado?: boolean;
}) {
  const router = useRouter();
  const [abierto, setAbierto] = useState<null | 'reportar' | 'bloquear'>(null);
  const [motivo, setMotivo] = useState('');
  const [detalle, setDetalle] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gracias, setGracias] = useState(false);

  async function reportar() {
    if (!motivo) {
      setError('Elegí el motivo.');
      return;
    }
    setEnviando(true);
    setError(null);
    const respuesta = await fetch('/api/denuncias', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        denunciadoId: denunciadoId ?? null,
        partidoId: partidoId ?? null,
        motivo,
        detalle: detalle.trim() || null,
      }),
    });
    setEnviando(false);
    if (!respuesta.ok) {
      const datos = await respuesta.json().catch(() => ({}));
      setError(datos.error ?? 'No pudimos enviar la denuncia.');
      return;
    }
    setGracias(true);
    setAbierto(null);
  }

  async function alternarBloqueo() {
    if (!denunciadoId) return;
    setEnviando(true);
    await fetch('/api/bloqueos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usuarioId: denunciadoId, accion: bloqueado ? 'desbloquear' : 'bloquear' }),
    });
    setEnviando(false);
    setAbierto(null);
    router.refresh();
  }

  if (gracias) {
    return (
      <p className="text-xs text-tinta-3">
        Recibimos tu denuncia. La revisamos y, si corresponde, actuamos. Gracias por cuidar la
        comunidad.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-4">
        <button
          type="button"
          className="text-xs font-semibold text-tinta-3"
          onClick={() => setAbierto(abierto === 'reportar' ? null : 'reportar')}
        >
          Reportar
        </button>
        {denunciadoId ? (
          <button
            type="button"
            className="text-xs font-semibold"
            style={{ color: bloqueado ? 'var(--tinta-3)' : 'var(--rojo)' }}
            onClick={() => (bloqueado ? alternarBloqueo() : setAbierto(abierto === 'bloquear' ? null : 'bloquear'))}
            disabled={enviando}
          >
            {bloqueado ? (enviando ? '…' : 'Desbloquear') : 'Bloquear'}
          </button>
        ) : null}
      </div>

      {abierto === 'reportar' ? (
        <div className="tarjeta flex flex-col gap-3 p-4">
          <div>
            <label className="rotulo-campo" htmlFor="motivo">¿Qué pasó?</label>
            <select id="motivo" className="campo" value={motivo} onChange={(evento) => setMotivo(evento.target.value)}>
              <option value="">Elegí el motivo…</option>
              {MOTIVOS_DENUNCIA.map((opcion) => (
                <option key={opcion.valor} value={opcion.valor}>{opcion.rotulo}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="rotulo-campo" htmlFor="detalle">Contanos más · opcional</label>
            <textarea
              id="detalle"
              className="campo min-h-16 resize-y"
              maxLength={500}
              value={detalle}
              onChange={(evento) => setDetalle(evento.target.value)}
            />
          </div>
          {error ? <p className="aviso-error">{error}</p> : null}
          <div className="grid grid-cols-2 gap-2">
            <button type="button" className="btn btn-fantasma btn-sm" onClick={() => setAbierto(null)}>
              Cancelar
            </button>
            <button type="button" className="btn btn-primario btn-sm" onClick={reportar} disabled={enviando}>
              {enviando ? 'Enviando…' : 'Enviar denuncia'}
            </button>
          </div>
        </div>
      ) : null}

      {abierto === 'bloquear' ? (
        <div className="tarjeta flex flex-col gap-3 p-4" style={{ borderColor: 'var(--rojo)' }}>
          <p className="text-sm">
            No se van a ver más en búsquedas ni chats, en los dos sentidos. Lo podés deshacer desde
            tu perfil.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" className="btn btn-fantasma btn-sm" onClick={() => setAbierto(null)}>
              No, dejalo
            </button>
            <button type="button" className="btn btn-peligro btn-sm" onClick={alternarBloqueo} disabled={enviando}>
              {enviando ? 'Bloqueando…' : 'Sí, bloquear'}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
