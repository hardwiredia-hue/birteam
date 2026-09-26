'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function BotoneraRsvp({
  partidoId,
  estadoActual,
}: {
  partidoId: string;
  estadoActual: string | null;
}) {
  const router = useRouter();
  const [enviando, setEnviando] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function elegir(estado: 'VOY' | 'TALVEZ' | 'NOVOY') {
    setEnviando(estado);
    setError(null);
    const respuesta = await fetch(`/api/partidos/${partidoId}/rsvp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado }),
    });
    if (!respuesta.ok) {
      const datos = await respuesta.json().catch(() => ({}));
      setError(datos.error ?? 'No pudimos guardar tu respuesta.');
    }
    setEnviando(null);
    router.refresh();
  }

  const enEspera = estadoActual === 'ESPERA';

  return (
    <div className="flex flex-col gap-2">
      {error ? <p className="aviso-error">{error}</p> : null}
      {enEspera ? (
        <p className="aviso-ok border-azul-txt text-azul-txt">
          Estás en la lista de espera. Si se libera un lugar, entrás y te avisamos.
        </p>
      ) : null}
      <div className="grid grid-cols-[1.6fr_1fr_1fr] gap-2">
        <button
          type="button"
          className={estadoActual === 'VOY' || enEspera ? 'btn btn-primario' : 'btn btn-secundario'}
          disabled={enviando !== null}
          onClick={() => elegir('VOY')}
        >
          {enviando === 'VOY' ? '…' : 'Voy'}
        </button>
        <button
          type="button"
          className="btn btn-secundario"
          style={estadoActual === 'TALVEZ' ? { borderColor: 'var(--naranja-txt)', color: 'var(--naranja-txt)' } : undefined}
          disabled={enviando !== null}
          onClick={() => elegir('TALVEZ')}
        >
          {enviando === 'TALVEZ' ? '…' : 'Tal vez'}
        </button>
        <button
          type="button"
          className="btn btn-fantasma"
          style={estadoActual === 'NOVOY' ? { color: 'var(--tinta)' } : undefined}
          disabled={enviando !== null}
          onClick={() => elegir('NOVOY')}
        >
          {enviando === 'NOVOY' ? '…' : 'No voy'}
        </button>
      </div>
    </div>
  );
}

export function PasarLista({
  partidoId,
  jugadores,
}: {
  partidoId: string;
  jugadores: { usuarioId: string; nombre: string }[];
}) {
  const router = useRouter();
  // Arranca con todos como "vino": lo normal es destildar al que faltó.
  const [marcas, setMarcas] = useState<Record<string, boolean>>(
    Object.fromEntries(jugadores.map((jugador) => [jugador.usuarioId, true]))
  );
  const [resultado, setResultado] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function guardar() {
    setEnviando(true);
    setError(null);
    const respuesta = await fetch(`/api/partidos/${partidoId}/asistencia`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        asistencias: jugadores.map((jugador) => ({
          usuarioId: jugador.usuarioId,
          asistio: marcas[jugador.usuarioId] ?? false,
        })),
        resultado: resultado.trim() || null,
      }),
    });
    if (!respuesta.ok) {
      const datos = await respuesta.json().catch(() => ({}));
      setError(datos.error ?? 'No pudimos guardar la lista.');
      setEnviando(false);
      return;
    }
    router.refresh();
  }

  return (
    <div className="tarjeta flex flex-col gap-3 p-4">
      <div>
        <p className="text-sm font-semibold">¿Quiénes vinieron?</p>
        <p className="text-xs text-tinta-3">
          Un toque por jugador. Esto arma el % de asistencia de cada perfil.
        </p>
      </div>
      <div>
        {jugadores.map((jugador) => {
          const vino = marcas[jugador.usuarioId] ?? false;
          return (
            <div key={jugador.usuarioId} className="flex items-center justify-between gap-3 border-b border-borde py-2 last:border-b-0">
              <span className="truncate text-sm font-semibold">{jugador.nombre}</span>
              <button
                type="button"
                className={vino ? 'chip-sel chip-sel-activo' : 'chip-sel'}
                onClick={() => setMarcas({ ...marcas, [jugador.usuarioId]: !vino })}
              >
                {vino ? 'Vino' : 'No fue'}
              </button>
            </div>
          );
        })}
      </div>
      <div>
        <label className="rotulo-campo" htmlFor="resultado">Resultado · opcional</label>
        <input
          id="resultado"
          className="campo tabular"
          placeholder="4–3"
          maxLength={40}
          value={resultado}
          onChange={(evento) => setResultado(evento.target.value)}
        />
      </div>
      {error ? <p className="aviso-error">{error}</p> : null}
      <button type="button" className="btn btn-primario" onClick={guardar} disabled={enviando}>
        {enviando ? 'Guardando…' : 'Guardar y cerrar el partido'}
      </button>
    </div>
  );
}

export function CancelarPartido({ partidoId }: { partidoId: string }) {
  const router = useRouter();
  const [confirmando, setConfirmando] = useState(false);
  const [enviando, setEnviando] = useState(false);

  async function cancelar() {
    setEnviando(true);
    await fetch(`/api/partidos/${partidoId}/cancelar`, { method: 'POST' });
    setEnviando(false);
    setConfirmando(false);
    router.refresh();
  }

  if (!confirmando) {
    return (
      <button type="button" className="btn btn-peligro" onClick={() => setConfirmando(true)}>
        Cancelar el partido
      </button>
    );
  }
  return (
    <div className="tarjeta flex flex-col gap-3 border-rojo p-4" style={{ borderColor: 'var(--rojo)' }}>
      <p className="text-sm">
        Se cancela para todos y les llega el aviso. No se puede deshacer.
      </p>
      <div className="grid grid-cols-2 gap-2">
        <button type="button" className="btn btn-fantasma" onClick={() => setConfirmando(false)}>
          No, dejarlo
        </button>
        <button type="button" className="btn btn-peligro" onClick={cancelar} disabled={enviando}>
          {enviando ? 'Cancelando…' : 'Sí, cancelar'}
        </button>
      </div>
    </div>
  );
}

export function CompartirPartido({ rutaPublica }: { rutaPublica: string }) {
  const [copiado, setCopiado] = useState(false);

  async function compartir() {
    // El link público: se abre sin cuenta y invita a sumarse en 30 segundos.
    const url = `${window.location.origin}${rutaPublica}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Partido en birteam', url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      // El usuario canceló el share; nada que hacer.
    }
  }

  return (
    <button type="button" className="btn btn-secundario" onClick={compartir}>
      {copiado ? 'Link copiado ✓' : 'Compartir el partido'}
    </button>
  );
}
