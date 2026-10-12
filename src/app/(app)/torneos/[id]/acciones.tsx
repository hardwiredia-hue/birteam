'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Compartir } from '@/components/compartir';

export function CompartirTorneo({ rutaPublica }: { rutaPublica: string }) {
  return (
    <Compartir
      ruta={rutaPublica}
      texto="Anotá tu equipo en este torneo de birteam"
      titulo="Convocar equipos"
      className="btn btn-secundario"
      etiqueta="Convocar equipos (compartir)"
    />
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

export function ArrancarTorneo({
  torneoId,
  equipos,
  formato = 'LIGA',
}: {
  torneoId: string;
  equipos: number;
  formato?: string;
}) {
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
        {formato === 'COPA'
          ? `Se cierra la inscripción con ${equipos} equipos y se sortea el cuadro de la copa. No se puede deshacer.`
          : `Se cierra la inscripción con ${equipos} equipos y se genera el fixture de liga (todos contra todos). No se puede deshacer.`}
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
  copa = false,
}: {
  torneoId: string;
  partidoTorneoId: string;
  /** Copa: si empatan, se cargan los penales. */
  copa?: boolean;
}) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [local, setLocal] = useState('');
  const [visitante, setVisitante] = useState('');
  const [penalesLocal, setPenalesLocal] = useState('');
  const [penalesVisitante, setPenalesVisitante] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const conPenales = copa && local !== '' && local === visitante;

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
        ...(conPenales ? { penalesLocal: Number(penalesLocal), penalesVisitante: Number(penalesVisitante) } : {}),
      }),
    });
    setEnviando(false);
    if (respuesta.ok) {
      router.refresh();
      return;
    }
    const datos = await respuesta.json().catch(() => ({}));
    setError(datos.error ?? 'No se pudo cargar.');
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
  const incompleto =
    local === '' ||
    visitante === '' ||
    (conPenales && (penalesLocal === '' || penalesVisitante === '' || penalesLocal === penalesVisitante));
  return (
    <span className="flex flex-shrink-0 flex-col items-center gap-1">
      <span className="flex items-center gap-1">
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
          disabled={enviando || incompleto}
          aria-label="Guardar resultado"
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M2.5 6.2 5 8.6l4.5-5" />
          </svg>
        </button>
      </span>
      {conPenales ? (
        <span className="flex items-center gap-1 text-[10px] text-tinta-3">
          Penales
          <input
            type="number"
            min={0}
            max={99}
            className="campo w-10 text-center tabular"
            style={{ padding: '2px' }}
            value={penalesLocal}
            onChange={(evento) => setPenalesLocal(evento.target.value)}
            aria-label="Penales del local"
          />
          –
          <input
            type="number"
            min={0}
            max={99}
            className="campo w-10 text-center tabular"
            style={{ padding: '2px' }}
            value={penalesVisitante}
            onChange={(evento) => setPenalesVisitante(evento.target.value)}
            aria-label="Penales del visitante"
          />
        </span>
      ) : null}
      {error ? <span className="max-w-40 text-center text-[10px] text-rojo">{error}</span> : null}
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
