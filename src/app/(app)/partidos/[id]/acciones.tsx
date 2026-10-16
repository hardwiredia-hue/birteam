'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Compartir } from '@/components/compartir';
import { CuentaRegresiva } from '@/components/cuenta-regresiva';
import { Interruptor } from '@/components/interruptor';

export function BotoneraRsvp({
  partidoId,
  estadoActual,
  invitacionHasta,
}: {
  partidoId: string;
  estadoActual: string | null;
  /** ISO: hasta cuándo tengo reservado un lugar liberado (o null). */
  invitacionHasta?: string | null;
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
  const reservaVigente =
    enEspera && invitacionHasta && new Date(invitacionHasta).getTime() > Date.now();
  const horaLimite = reservaVigente
    ? new Date(invitacionHasta!).toLocaleTimeString('es-AR', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'America/Argentina/Buenos_Aires',
      })
    : null;

  return (
    <div className="flex flex-col gap-2">
      {error ? <p className="aviso-error">{error}</p> : null}
      {reservaVigente ? (
        <p className="aviso-ok">
          Se liberó un lugar y es tuyo hasta las {horaLimite} (quedan{' '}
          <CuentaRegresiva hasta={invitacionHasta!} alTerminar={() => router.refresh()} className="font-bold" />
          ). Tocá <b>Voy</b> y quedás adentro; si no, pasa al siguiente.
        </p>
      ) : enEspera ? (
        <p className="aviso-ok border-azul-txt text-azul-txt">
          Estás en la lista de espera. Si se libera un lugar, te lo reservamos 2 horas y te
          avisamos.
        </p>
      ) : null}
      <div className="grid grid-cols-[1.4fr_1fr_1fr] gap-2 [&>.btn]:whitespace-nowrap [&>.btn]:px-3">
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
  // El link público: se abre sin cuenta y invita a sumarse en 30 segundos.
  return (
    <Compartir
      ruta={rutaPublica}
      texto="Sumate a mi partido en birteam"
      titulo="Compartir el partido"
      className="btn btn-secundario"
      etiqueta="Compartir el partido"
    />
  );
}

/** Nombrar o quitar al co-organizador, entre los confirmados. Solo organiza. */
export function ElegirCoorganizador({
  partidoId,
  candidatos,
  actualId,
}: {
  partidoId: string;
  candidatos: { usuarioId: string; nombre: string }[];
  actualId: string | null;
}) {
  const router = useRouter();
  const [elegido, setElegido] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function mandar(usuarioId: string | null) {
    setOcupado(true);
    setError(null);
    const respuesta = await fetch(`/api/partidos/${partidoId}/coorganizador`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usuarioId }),
    });
    setOcupado(false);
    if (!respuesta.ok) {
      const datos = await respuesta.json().catch(() => ({}));
      setError(datos.error ?? 'No pudimos guardar el cambio.');
      return;
    }
    setElegido('');
    router.refresh();
  }

  const actual = candidatos.find((c) => c.usuarioId === actualId);

  return (
    <div className="tarjeta flex flex-col gap-2.5 p-4">
      <p className="text-sm font-semibold">Co-organizador</p>
      {actual ? (
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-tinta-2">
            {actual.nombre} también puede editar, pasar lista y cancelar.
          </p>
          <button
            type="button"
            className="btn btn-secundario btn-sm"
            onClick={() => mandar(null)}
            disabled={ocupado}
          >
            Quitar
          </button>
        </div>
      ) : candidatos.length > 0 ? (
        <div className="flex gap-2">
          <select
            className="campo flex-1"
            aria-label="Co-organizador"
            value={elegido}
            onChange={(evento) => setElegido(evento.target.value)}
          >
            <option value="">Elegí entre los confirmados…</option>
            {candidatos.map((c) => (
              <option key={c.usuarioId} value={c.usuarioId}>
                {c.nombre}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="btn btn-secundario btn-sm"
            onClick={() => elegido && mandar(elegido)}
            disabled={ocupado || !elegido}
          >
            Nombrar
          </button>
        </div>
      ) : (
        <p className="text-xs text-tinta-3">
          Cuando alguien confirme, podés nombrarlo co-organizador para repartir el laburo.
        </p>
      )}
      {error ? <p className="aviso-error">{error}</p> : null}
    </div>
  );
}

/**
 * Pie fijo en el celular, arriba de la barra de abajo: el cupo y un "Voy"
 * grande, para anotarse sin bajar hasta el final del partido. Se muestra a
 * quien todavía no respondió (o puso "Tal vez").
 */
export function BarraVoy({ partidoId, faltan }: { partidoId: string; faltan: number }) {
  const router = useRouter();
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function voy() {
    setEnviando(true);
    setError(null);
    const respuesta = await fetch(`/api/partidos/${partidoId}/rsvp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado: 'VOY' }),
    });
    if (!respuesta.ok) {
      const datos = await respuesta.json().catch(() => ({}));
      setError(datos.error ?? 'No pudimos anotarte. Probá de nuevo.');
      setEnviando(false);
      return;
    }
    router.refresh();
  }

  return (
    <>
      {/* Lugar para que el pie no tape lo último de la página. */}
      <div className="h-20 lg:hidden" aria-hidden />
      <div className="fixed inset-x-0 bottom-16 z-10 border-t border-borde bg-fondo/95 backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-md items-center gap-3 px-5 py-3">
          <div className="min-w-0 flex-1">
            {error ? (
              <p className="text-xs text-rojo">{error}</p>
            ) : (
              <>
                <p className="text-sm font-semibold" style={{ color: faltan > 0 ? 'var(--verde-txt)' : 'var(--azul-txt)' }}>
                  {faltan > 0 ? `Faltan ${faltan}` : 'Está completo'}
                </p>
                <p className="text-xs text-tinta-3">{faltan > 0 ? 'Anotate y quedás adentro.' : 'Entrás a la lista de espera.'}</p>
              </>
            )}
          </div>
          <button type="button" onClick={voy} disabled={enviando} className="btn btn-primario w-36">
            {enviando ? 'Anotando…' : faltan > 0 ? 'Voy' : 'Anotarme'}
          </button>
        </div>
      </div>
    </>
  );
}

/** Cerrar la lista: no se anota nadie más (los anotados pueden bajarse). */
export function CerrarLista({ partidoId, cerrada: inicial }: { partidoId: string; cerrada: boolean }) {
  const router = useRouter();
  const [cerrada, setCerrada] = useState(inicial);
  const [error, setError] = useState<string | null>(null);

  async function cambiar() {
    const nueva = !cerrada;
    setCerrada(nueva);
    setError(null);
    const respuesta = await fetch(`/api/partidos/${partidoId}/lista`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cerrada: nueva }),
    });
    if (!respuesta.ok) {
      const datos = await respuesta.json().catch(() => ({}));
      setError(datos.error ?? 'No pudimos guardarlo.');
      setCerrada(!nueva);
      return;
    }
    router.refresh();
  }

  return (
    <div className="tarjeta flex flex-col gap-2 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">Cerrar la lista</p>
          <p className="text-xs text-tinta-3">
            {cerrada
              ? 'No se anota nadie más. Los anotados pueden bajarse y la espera sigue.'
              : 'Cuando ya tengas a tu gente: deja de aparecer en Explorar y nadie nuevo se anota.'}
          </p>
        </div>
        <Interruptor prendido={cerrada} alCambiar={cambiar} rotulo="Cerrar la lista" />
      </div>
      {error ? <p className="aviso-error">{error}</p> : null}
    </div>
  );
}
