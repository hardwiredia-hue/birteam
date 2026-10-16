'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { MOTIVOS_CIERRE, type MotivoCierre } from '@/lib/cerrar-dia-comun';
import { EnlaceAyuda } from '@/components/ayuda';

interface Reservada {
  id: string;
  cancha: string;
  hora: string;
  quien: string;
  estado: string;
}

/**
 * "Cerrar un día": feriado, mantenimiento o un evento. Bloquea los turnos
 * libres de una; lo reservado queda y se lista para avisar o cancelar.
 */
export function CerrarDia({
  canchaId,
  dias,
  cerrados,
  variasCanchas,
}: {
  canchaId: string;
  dias: { fecha: string; rotulo: string }[];
  cerrados: { fecha: string; rotulo: string; motivo: string }[];
  variasCanchas: boolean;
}) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [fecha, setFecha] = useState(dias[0]?.fecha ?? '');
  const [motivo, setMotivo] = useState<MotivoCierre>('Feriado');
  const [todas, setTodas] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<{ bloqueados: number; reservadas: Reservada[] } | null>(null);
  const [, refrescar] = useTransition();

  async function pedir(metodo: 'POST' | 'DELETE', dia: string) {
    setEnviando(true);
    setError(null);
    const respuesta = await fetch(`/api/canchas/${canchaId}/cerrar-dia`, {
      method: metodo,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fecha: dia, motivo, todas }),
    });
    const datos = await respuesta.json().catch(() => ({}));
    setEnviando(false);
    if (!respuesta.ok) {
      setError(datos.error ?? 'No pudimos hacerlo. Probá de nuevo.');
      return;
    }
    setResultado(metodo === 'POST' ? datos : null);
    if (metodo === 'POST') setAbierto(false);
    refrescar(() => router.refresh());
  }

  return (
    <section className="tarjeta flex flex-col gap-3 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">Cerrar un día</p>
          <p className="text-xs text-tinta-3">Feriado, mantenimiento o un evento: bloquea de una los turnos libres.</p>
          <EnlaceAyuda tema="complejos" articulo="cerrar-dia" className="mt-1" />
        </div>
        {!abierto ? (
          <button type="button" className="btn btn-secundario btn-sm shrink-0" onClick={() => setAbierto(true)}>
            Elegir día
          </button>
        ) : null}
      </div>

      {cerrados.length > 0 ? (
        <ul className="flex flex-col gap-1.5 border-t border-borde pt-3">
          {cerrados.map((dia) => (
            <li key={dia.fecha} className="flex items-center justify-between gap-3 text-sm">
              <span>
                <span className="font-semibold tabular">{dia.rotulo}</span>
                <span className="text-tinta-3"> · cerrado ({dia.motivo.toLowerCase()})</span>
              </span>
              <button
                type="button"
                className="text-[13px] font-semibold text-verde-txt"
                disabled={enviando}
                onClick={() => pedir('DELETE', dia.fecha)}
              >
                Abrir
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {abierto ? (
        <div className="flex flex-col gap-3 border-t border-borde pt-3">
          <label className="flex flex-col gap-1">
            <span className="rotulo-campo">Día</span>
            <select className="campo" value={fecha} onChange={(evento) => setFecha(evento.target.value)}>
              {dias.map((dia) => (
                <option key={dia.fecha} value={dia.fecha}>
                  {dia.rotulo}
                </option>
              ))}
            </select>
          </label>
          <div>
            <span className="rotulo-campo">Motivo</span>
            <div className="mt-1 flex flex-wrap gap-2">
              {MOTIVOS_CIERRE.map((opcion) => (
                <button
                  key={opcion}
                  type="button"
                  aria-pressed={motivo === opcion}
                  onClick={() => setMotivo(opcion)}
                  className={motivo === opcion ? 'chip-sel chip-sel-activo' : 'chip-sel'}
                >
                  {opcion}
                </button>
              ))}
            </div>
          </div>
          {variasCanchas ? (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={todas} onChange={(evento) => setTodas(evento.target.checked)} />
              Todas las canchas del complejo
            </label>
          ) : null}
          <div className="flex gap-2">
            <button type="button" className="btn btn-secundario btn-sm" disabled={enviando || !fecha} onClick={() => pedir('POST', fecha)}>
              {enviando ? 'Cerrando…' : 'Cerrar el día'}
            </button>
            <button type="button" className="btn btn-fantasma btn-sm" onClick={() => setAbierto(false)}>
              Cancelar
            </button>
          </div>
        </div>
      ) : null}

      {resultado ? (
        <div className="flex flex-col gap-1.5 border-t border-borde pt-3 text-sm" role="status">
          <p>
            {resultado.bloqueados > 0
              ? `Listo: bloqueamos ${resultado.bloqueados} ${resultado.bloqueados === 1 ? 'turno libre' : 'turnos libres'}.`
              : 'No quedaban turnos libres para bloquear.'}
          </p>
          {resultado.reservadas.length > 0 ? (
            <>
              <p className="text-xs text-naranja-txt">
                Ya estaban tomados (no los tocamos): avisales o cancelalos desde la grilla.
              </p>
              <ul className="flex flex-col gap-1 text-[13px] text-tinta-2">
                {resultado.reservadas.map((r) => (
                  <li key={r.id} className="tabular">
                    {r.hora} · {r.quien}
                    {variasCanchas ? ` · ${r.cancha}` : ''}
                    {r.estado === 'SOLICITADA' ? ' · pedido sin confirmar' : ''}
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </div>
      ) : null}
      {error ? <p className="aviso-error">{error}</p> : null}
    </section>
  );
}
