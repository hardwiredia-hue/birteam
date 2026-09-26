'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function CompartirTorneo({ rutaPublica }: { rutaPublica: string }) {
  const [copiado, setCopiado] = useState(false);

  async function compartir() {
    const url = `${window.location.origin}${rutaPublica}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Torneo en birteam', url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      // Canceló el share.
    }
  }

  return (
    <button type="button" className="btn btn-secundario" onClick={compartir}>
      {copiado ? 'Link copiado ✓' : 'Convocar equipos (compartir)'}
    </button>
  );
}

export function AnotarEquipo({ torneoId }: { torneoId: string }) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [nombre, setNombre] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function anotar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setEnviando(true);
    setError(null);
    const respuesta = await fetch(`/api/torneos/${torneoId}/inscribir`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre: nombre.trim() }),
    });
    const datos = await respuesta.json().catch(() => ({}));
    setEnviando(false);
    if (!respuesta.ok) {
      setError(datos.error ?? 'No pudimos anotar al equipo.');
      return;
    }
    router.refresh();
  }

  if (!abierto) {
    return (
      <button type="button" className="btn btn-primario" onClick={() => setAbierto(true)}>
        Anotar mi equipo
      </button>
    );
  }
  return (
    <form onSubmit={anotar} className="tarjeta flex flex-col gap-3 p-4">
      <div>
        <label className="rotulo-campo" htmlFor="nombre-equipo">Nombre del equipo</label>
        <input
          id="nombre-equipo"
          className="campo"
          placeholder="Los Pibes FC"
          value={nombre}
          maxLength={40}
          onChange={(evento) => setNombre(evento.target.value)}
        />
      </div>
      {error ? <p className="aviso-error">{error}</p> : null}
      <div className="grid grid-cols-2 gap-2">
        <button type="button" className="btn btn-fantasma btn-sm" onClick={() => setAbierto(false)}>
          Cancelar
        </button>
        <button type="submit" className="btn btn-primario btn-sm" disabled={enviando || nombre.trim().length < 2}>
          {enviando ? 'Anotando…' : 'Anotar'}
        </button>
      </div>
    </form>
  );
}

export function ArrancarTorneo({ torneoId, equipos }: { torneoId: string; equipos: number }) {
  const router = useRouter();
  const [confirmando, setConfirmando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function arrancar() {
    setEnviando(true);
    setError(null);
    const respuesta = await fetch(`/api/torneos/${torneoId}/arrancar`, { method: 'POST' });
    const datos = await respuesta.json().catch(() => ({}));
    setEnviando(false);
    if (!respuesta.ok) {
      setError(datos.error ?? 'No pudimos arrancar el torneo.');
      return;
    }
    router.refresh();
  }

  if (!confirmando) {
    return (
      <div className="flex flex-col gap-2">
        {error ? <p className="aviso-error">{error}</p> : null}
        <button
          type="button"
          className="btn btn-secundario"
          onClick={() => setConfirmando(true)}
          disabled={equipos < 2}
        >
          {equipos < 2 ? 'Hacen falta al menos 2 equipos' : 'Cerrar inscripción y arrancar'}
        </button>
      </div>
    );
  }
  return (
    <div className="tarjeta flex flex-col gap-3 p-4">
      <p className="text-sm">
        Se cierra la inscripción con {equipos} equipos y se genera el fixture de liga (todos
        contra todos). No se puede deshacer.
      </p>
      {error ? <p className="aviso-error">{error}</p> : null}
      <div className="grid grid-cols-2 gap-2">
        <button type="button" className="btn btn-fantasma btn-sm" onClick={() => setConfirmando(false)}>
          Todavía no
        </button>
        <button type="button" className="btn btn-primario btn-sm" onClick={arrancar} disabled={enviando}>
          {enviando ? 'Generando…' : 'Sí, arrancar'}
        </button>
      </div>
    </div>
  );
}

export function CargarResultado({
  torneoId,
  partidoTorneoId,
}: {
  torneoId: string;
  partidoTorneoId: string;
}) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [local, setLocal] = useState('');
  const [visitante, setVisitante] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function guardar() {
    if (local === '' || visitante === '') return;
    setEnviando(true);
    const respuesta = await fetch(`/api/torneos/${torneoId}/resultado`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        partidoTorneoId,
        golesLocal: Number(local),
        golesVisitante: Number(visitante),
      }),
    });
    setEnviando(false);
    if (respuesta.ok) router.refresh();
  }

  if (!abierto) {
    return (
      <button
        type="button"
        className="chip-sel flex-shrink-0 !px-2 text-[10px]"
        onClick={() => setAbierto(true)}
        style={{ paddingLeft: 8, paddingRight: 8 }}
      >
        Resultado
      </button>
    );
  }
  return (
    <span className="flex flex-shrink-0 items-center gap-1">
      <input
        type="number"
        min={0}
        max={99}
        className="campo w-11 !px-1 text-center tabular"
        style={{ padding: '4px 2px' }}
        value={local}
        onChange={(evento) => setLocal(evento.target.value)}
        aria-label="Goles del local"
      />
      <span className="t-rotulo">–</span>
      <input
        type="number"
        min={0}
        max={99}
        className="campo w-11 text-center tabular"
        style={{ padding: '4px 2px' }}
        value={visitante}
        onChange={(evento) => setVisitante(evento.target.value)}
        aria-label="Goles del visitante"
      />
      <button
        type="button"
        className="btn btn-primario btn-sm"
        style={{ padding: '5px 8px', fontSize: 11 }}
        onClick={guardar}
        disabled={enviando || local === '' || visitante === ''}
      >
        ✓
      </button>
    </span>
  );
}

export function TerminarTorneo({ torneoId, pendientes }: { torneoId: string; pendientes: number }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function terminar() {
    setEnviando(true);
    setError(null);
    const respuesta = await fetch(`/api/torneos/${torneoId}/terminar`, { method: 'POST' });
    const datos = await respuesta.json().catch(() => ({}));
    setEnviando(false);
    if (!respuesta.ok) {
      setError(datos.error ?? 'No pudimos cerrar el torneo.');
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-2">
      {error ? <p className="aviso-error">{error}</p> : null}
      <button type="button" className="btn btn-secundario" onClick={terminar} disabled={enviando || pendientes > 0}>
        {pendientes > 0
          ? `Faltan ${pendientes} resultados para cerrar el torneo`
          : enviando
            ? 'Cerrando…'
            : 'Cerrar el torneo y coronar al campeón'}
      </button>
    </div>
  );
}
