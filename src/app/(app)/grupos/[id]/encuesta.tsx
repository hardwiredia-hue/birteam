'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

export interface OpcionVista {
  id: string;
  rotulo: string;
  /** Día y hora en horario argentino, para armar el partido. */
  dia: string;
  hora: string;
  votos: { id: string; nombre: string }[];
}

const MAXIMO = 5;
const HORAS = Array.from({ length: 36 }, (_, i) => {
  const minutos = 6 * 60 + i * 30;
  return `${String(Math.floor(minutos / 60)).padStart(2, '0')}:${String(minutos % 60).padStart(2, '0')}`;
});

/** Mañana + i días, en el formato del campo de fecha. */
function diaMasN(n: number) {
  return new Date(Date.now() + n * 86400_000).toLocaleDateString('en-CA', {
    timeZone: 'America/Argentina/Buenos_Aires',
  });
}

/**
 * "¿Cuándo jugamos?": con encuesta abierta, cada uno marca los horarios que
 * puede; quien la propuso (o un admin) arma el partido con el más votado.
 * Sin encuesta, cualquiera del grupo propone de 2 a 5 horarios.
 */
export function EncuestaGrupo({
  grupoId,
  miId,
  encuesta,
  puedeCerrar,
}: {
  grupoId: string;
  miId: string;
  encuesta: { id: string; creador: string; opciones: OpcionVista[] } | null;
  puedeCerrar: boolean;
}) {
  const router = useRouter();
  const [, refrescar] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [mios, setMios] = useState<string[]>(
    encuesta?.opciones.filter((o) => o.votos.some((v) => v.id === miId)).map((o) => o.id) ?? []
  );
  const [proponiendo, setProponiendo] = useState(false);
  const [filas, setFilas] = useState([
    { dia: diaMasN(1), hora: '21:00' },
    { dia: diaMasN(2), hora: '21:00' },
  ]);

  async function marcar(opcionId: string) {
    const nuevos = mios.includes(opcionId) ? mios.filter((id) => id !== opcionId) : [...mios, opcionId];
    const anteriores = mios;
    setMios(nuevos);
    setError(null);
    const respuesta = await fetch(`/api/encuestas/${encuesta!.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ opcionIds: nuevos }),
    });
    if (!respuesta.ok) {
      setMios(anteriores);
      setError((await respuesta.json().catch(() => ({}))).error ?? 'No pudimos guardar tu voto.');
      return;
    }
    refrescar(() => router.refresh());
  }

  async function proponer() {
    setEnviando(true);
    setError(null);
    const respuesta = await fetch(`/api/grupos/${grupoId}/encuesta`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ opciones: filas.map((f) => `${f.dia}T${f.hora}:00-03:00`) }),
    });
    setEnviando(false);
    if (!respuesta.ok) {
      setError((await respuesta.json().catch(() => ({}))).error ?? 'No pudimos crear la encuesta.');
      return;
    }
    setProponiendo(false);
    refrescar(() => router.refresh());
  }

  async function cerrar() {
    if (!confirm('¿Cerrar la encuesta sin armar el partido?')) return;
    const respuesta = await fetch(`/api/encuestas/${encuesta!.id}`, { method: 'DELETE' });
    if (!respuesta.ok) {
      setError((await respuesta.json().catch(() => ({}))).error ?? 'No pudimos cerrarla.');
      return;
    }
    refrescar(() => router.refresh());
  }

  if (encuesta) {
    // Con mi voto ya contado (aunque la página no se haya refrescado).
    const conteo = (o: OpcionVista) => o.votos.filter((v) => v.id !== miId).length + (mios.includes(o.id) ? 1 : 0);
    const maximo = Math.max(...encuesta.opciones.map(conteo));
    const ganadora = maximo > 0 ? encuesta.opciones.find((o) => conteo(o) === maximo) : null;
    return (
      <section id="cuando" className="tarjeta flex scroll-mt-20 flex-col gap-3 p-4">
        <div>
          <p className="text-sm font-semibold">¿Cuándo jugamos?</p>
          <p className="text-xs text-tinta-3">Propuso {encuesta.creador}. Tocá los horarios que podés.</p>
        </div>
        <ul className="flex flex-col gap-2">
          {encuesta.opciones.map((opcion) => {
            const marcada = mios.includes(opcion.id);
            const votos = conteo(opcion);
            const nombres = [
              ...(marcada ? ['Vos'] : []),
              ...opcion.votos.filter((v) => v.id !== miId).map((v) => v.nombre.split(' ')[0]),
            ];
            return (
              <li key={opcion.id}>
                <button
                  type="button"
                  aria-pressed={marcada}
                  onClick={() => marcar(opcion.id)}
                  className={`flex w-full items-center gap-3 rounded-[6px] border p-3 text-left ${
                    marcada ? 'border-verde-txt' : 'border-borde'
                  }`}
                >
                  <span
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-[4px] border text-[12px] font-bold ${
                      marcada ? 'border-verde-txt bg-verde text-[#0b0d03]' : 'border-borde-2'
                    }`}
                    aria-hidden
                  >
                    {marcada ? '✓' : ''}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold first-letter:uppercase">{opcion.rotulo}</span>
                    <span className="block truncate text-xs text-tinta-3">
                      {nombres.length > 0 ? nombres.join(', ') : 'Nadie todavía'}
                    </span>
                  </span>
                  <span className={`t-display text-[18px] tabular ${ganadora?.id === opcion.id ? 'text-verde-txt' : 'text-tinta-3'}`}>
                    {votos}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        {puedeCerrar ? (
          <div className="flex flex-wrap items-center gap-3 border-t border-borde pt-3">
            {ganadora ? (
              <Link
                href={`/crear?grupo=${grupoId}&fecha=${ganadora.dia}&hora=${ganadora.hora}&encuesta=${encuesta.id}`}
                className="btn btn-secundario btn-sm"
              >
                Armar el partido: {ganadora.rotulo}
              </Link>
            ) : null}
            <button type="button" className="text-[13px] font-semibold text-tinta-3 hover:text-tinta" onClick={cerrar}>
              Cerrar sin armar
            </button>
          </div>
        ) : null}
        {error ? <p className="aviso-error">{error}</p> : null}
      </section>
    );
  }

  return (
    <section id="cuando" className="tarjeta flex scroll-mt-20 flex-col gap-3 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">¿Cuándo jugamos?</p>
          <p className="text-xs text-tinta-3">Proponé horarios, el grupo marca los que puede y armás el partido con el más votado.</p>
        </div>
        {!proponiendo ? (
          <button type="button" className="btn btn-secundario btn-sm shrink-0" onClick={() => setProponiendo(true)}>
            Proponer
          </button>
        ) : null}
      </div>
      {proponiendo ? (
        <div className="flex flex-col gap-2 border-t border-borde pt-3">
          {filas.map((fila, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="date"
                className="campo"
                aria-label={`Día ${i + 1}`}
                min={diaMasN(0)}
                value={fila.dia}
                onChange={(evento) => setFilas(filas.map((f, j) => (j === i ? { ...f, dia: evento.target.value } : f)))}
              />
              <select
                className="campo w-28"
                aria-label={`Hora ${i + 1}`}
                value={fila.hora}
                onChange={(evento) => setFilas(filas.map((f, j) => (j === i ? { ...f, hora: evento.target.value } : f)))}
              >
                {HORAS.map((hora) => (
                  <option key={hora} value={hora}>
                    {hora}
                  </option>
                ))}
              </select>
              {filas.length > 2 ? (
                <button
                  type="button"
                  aria-label="Quitar este horario"
                  className="chip-sel h-9 w-9 shrink-0 justify-center p-0"
                  onClick={() => setFilas(filas.filter((_, j) => j !== i))}
                >
                  ×
                </button>
              ) : null}
            </div>
          ))}
          {filas.length < MAXIMO ? (
            <button
              type="button"
              className="self-start text-[13px] font-semibold text-verde-txt"
              onClick={() => setFilas([...filas, { dia: diaMasN(filas.length + 1), hora: filas[filas.length - 1].hora }])}
            >
              + Otro horario
            </button>
          ) : null}
          <div className="flex gap-2 pt-1">
            <button type="button" className="btn btn-secundario btn-sm" disabled={enviando} onClick={proponer}>
              {enviando ? 'Enviando…' : 'Mandar al grupo'}
            </button>
            <button type="button" className="btn btn-fantasma btn-sm" onClick={() => setProponiendo(false)}>
              Cancelar
            </button>
          </div>
        </div>
      ) : null}
      {error ? <p className="aviso-error">{error}</p> : null}
    </section>
  );
}
