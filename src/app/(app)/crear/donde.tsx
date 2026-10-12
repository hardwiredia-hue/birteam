'use client';

import { useEffect, useRef, useState } from 'react';
import { formatearDistancia } from '@/lib/geo';
import type { CanchaParaElegir, LugarParaElegir } from '@/lib/lugares';

export type CanchaElegible = Omit<CanchaParaElegir, 'km'> & { km?: number | null };

/** Minúsculas y sin tildes, para comparar nombres. */
const normalizar = (texto: string) =>
  texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();

/**
 * "¿Dónde juegan?": buscás la cancha o el lugar entre lo que ya está en
 * birteam (canchas publicadas y lugares que cargó la comunidad, lo más cerca
 * primero). Si no está, se crea al crear el partido y queda para todos. Un
 * dueño puede publicar su cancha desde acá mismo.
 */
export function PasoDonde({
  deporteId,
  deporteNombre,
  esDueno,
  ciudad,
  provincia,
  propios,
  lugarNombre,
  direccion,
  telefono,
  canchaElegida,
  lugarId,
  alEscribir,
  alElegirCancha,
  alElegirLugar,
  setDireccion,
  setTelefono,
}: {
  deporteId: string | null;
  deporteNombre: string | null;
  esDueno: boolean;
  ciudad: string | null;
  provincia: string | null;
  /** Lugares donde ya organizó (los suyos). */
  propios: { id: string; nombre: string; direccion: string | null; telefono: string | null }[];
  lugarNombre: string;
  direccion: string;
  telefono: string;
  canchaElegida: CanchaElegible | null;
  lugarId: string | null;
  alEscribir: (texto: string) => void;
  alElegirCancha: (cancha: CanchaElegible) => void;
  alElegirLugar: (lugar: { id: string | null; nombre: string; direccion: string | null; telefono: string | null }) => void;
  setDireccion: (texto: string) => void;
  setTelefono: (texto: string) => void;
}) {
  const [resultados, setResultados] = useState<{ canchas: CanchaParaElegir[]; lugares: LugarParaElegir[] } | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [publicando, setPublicando] = useState(false);
  const [aviso, setAviso] = useState<{ error: boolean; texto: string } | null>(null);
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);
  const elegido = canchaElegida != null || lugarId != null;
  const texto = lugarNombre.trim();

  // Sin texto: lo que hay cerca. Con texto: lo que coincide (con una pausa
  // corta para no buscar en cada letra).
  useEffect(() => {
    if (elegido) return;
    if (temporizador.current) clearTimeout(temporizador.current);
    temporizador.current = setTimeout(
      async () => {
        setBuscando(true);
        try {
          const parametros = new URLSearchParams();
          if (texto.length >= 2) parametros.set('q', texto);
          if (deporteId) parametros.set('deporteId', deporteId);
          const respuesta = await fetch(`/api/lugares?${parametros.toString()}`);
          if (respuesta.ok) setResultados(await respuesta.json());
        } catch {
          // Sin conexión: se puede escribir igual.
        } finally {
          setBuscando(false);
        }
      },
      texto.length >= 2 ? 250 : 0
    );
    return () => {
      if (temporizador.current) clearTimeout(temporizador.current);
    };
  }, [texto, deporteId, elegido]);

  const conTexto = texto.length >= 2;
  const canchas = resultados?.canchas ?? [];
  const lugares = resultados?.lugares ?? [];
  const yaEsta = [...canchas, ...lugares].some((r) => normalizar(r.nombre) === normalizar(texto));

  async function publicarMiCancha() {
    if (direccion.trim().length < 2) {
      setAviso({ error: true, texto: 'Poné la dirección de tu cancha para publicarla.' });
      return;
    }
    if (!deporteId) return;
    setPublicando(true);
    setAviso(null);
    const respuesta = await fetch('/api/canchas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre: texto,
        deporteId,
        direccion: direccion.trim(),
        telefono: telefono.trim() || null,
        ciudad,
        provincia,
      }),
    });
    const datos = await respuesta.json().catch(() => ({}));
    setPublicando(false);
    if (!respuesta.ok) {
      setAviso({ error: true, texto: datos.error ?? 'No pudimos publicarla. Probá de nuevo.' });
      return;
    }
    alElegirCancha({
      id: datos.id,
      nombre: texto,
      direccion: direccion.trim(),
      telefono: telefono.trim() || null,
      ciudad,
      deporteId,
      deporte: deporteNombre ?? '',
      diasDisponibles: [0, 1, 2, 3, 4, 5, 6],
    });
    setAviso({
      error: false,
      texto: 'Listo: tu cancha quedó publicada. Precio, horarios y fotos los completás cuando quieras desde Mi complejo.',
    });
  }

  return (
    <section className="flex flex-col gap-4">
      <h1 className="t-display text-[32px]">
        ¿Dónde
        <br />
        juegan?
      </h1>

      {elegido ? (
        <div className="tarjeta flex items-start justify-between gap-3 p-4" style={{ borderColor: canchaElegida ? 'var(--naranja-txt)' : 'var(--verde)' }}>
          <div className="min-w-0">
            <p className={canchaElegida ? 't-rotulo text-naranja-txt' : 't-rotulo text-verde-txt'}>
              {canchaElegida ? `Cancha en birteam · ${canchaElegida.deporte}` : 'Lugar'}
            </p>
            <p className="mt-0.5 truncate text-[15px] font-semibold">{lugarNombre}</p>
            {direccion || canchaElegida?.ciudad ? (
              <p className="truncate text-xs text-tinta-3">
                {direccion}
                {direccion && canchaElegida?.ciudad ? ' · ' : ''}
                {canchaElegida?.ciudad ?? ''}
              </p>
            ) : null}
          </div>
          <button type="button" onClick={() => alEscribir('')} className="shrink-0 text-[13px] font-semibold text-tinta-2 hover:text-tinta">
            Cambiar
          </button>
        </div>
      ) : (
        <div>
          <label className="rotulo-campo" htmlFor="lugar">
            Cancha o lugar
          </label>
          <input
            id="lugar"
            className="campo"
            placeholder="Buscá o escribí: El Potrero, Club Atlético…"
            autoComplete="off"
            value={lugarNombre}
            onChange={(evento) => alEscribir(evento.target.value)}
          />
        </div>
      )}

      {aviso ? (
        <p className={aviso.error ? 'aviso-error' : 'aviso-ok'} role={aviso.error ? 'alert' : 'status'}>
          {aviso.texto}
        </p>
      ) : null}

      {!elegido && !conTexto && propios.length > 0 ? (
        <div>
          <span className="rotulo-campo">Donde ya organizaste</span>
          <div className="flex flex-wrap gap-2">
            {propios.map((propio) => (
              <button
                key={propio.id}
                type="button"
                onClick={() => alElegirLugar({ id: null, nombre: propio.nombre, direccion: propio.direccion, telefono: propio.telefono })}
                className="chip-sel"
              >
                {propio.nombre}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {!elegido && (canchas.length > 0 || lugares.length > 0) ? (
        <div className="flex flex-col gap-2" aria-live="polite">
          <span className="rotulo-campo">{conTexto ? 'En birteam' : 'Cerca tuyo'}</span>
          {canchas.map((cancha) => (
            <button key={cancha.id} type="button" onClick={() => alElegirCancha(cancha)} className="tarjeta p-3.5 text-left hover:border-borde-2">
              <span className="flex items-baseline justify-between gap-3">
                <span className="t-rotulo text-naranja-txt">Cancha · {cancha.deporte}</span>
                {cancha.km != null ? <span className="t-rotulo tabular">a {formatearDistancia(cancha.km)}</span> : null}
              </span>
              <span className="mt-0.5 block text-sm font-semibold">{cancha.nombre}</span>
              <span className="mt-0.5 block truncate text-xs text-tinta-3">
                {cancha.direccion ?? ''}
                {cancha.direccion && cancha.ciudad ? ' · ' : ''}
                {cancha.ciudad ?? ''}
              </span>
            </button>
          ))}
          {lugares.map((lugar) => (
            <button key={lugar.id} type="button" onClick={() => alElegirLugar(lugar)} className="tarjeta p-3.5 text-left hover:border-borde-2">
              <span className="flex items-baseline justify-between gap-3">
                <span className="t-rotulo text-verde-txt">
                  Lugar{lugar.usos > 1 ? ` · ${lugar.usos} partidos` : ''}
                </span>
                {lugar.km != null ? <span className="t-rotulo tabular">a {formatearDistancia(lugar.km)}</span> : null}
              </span>
              <span className="mt-0.5 block text-sm font-semibold">{lugar.nombre}</span>
              {lugar.direccion || lugar.ciudad ? (
                <span className="mt-0.5 block truncate text-xs text-tinta-3">
                  {lugar.direccion ?? ''}
                  {lugar.direccion && lugar.ciudad ? ' · ' : ''}
                  {lugar.ciudad ?? ''}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      ) : null}

      {!elegido && conTexto && !buscando && !yaEsta ? (
        <div className="tarjeta flex flex-col gap-3 p-4">
          <div>
            <p className="text-[15px] font-semibold">Nuevo: &ldquo;{texto}&rdquo;</p>
            <p className="text-xs text-tinta-3">
              Queda guardado en birteam{ciudad ? ` (${ciudad})` : ''}: la próxima vez vos y cualquiera lo encuentran
              buscándolo.
            </p>
          </div>
          <Datos direccion={direccion} telefono={telefono} setDireccion={setDireccion} setTelefono={setTelefono} />
          {esDueno ? (
            <div className="flex flex-col gap-1.5 border-t border-borde pt-3">
              <button type="button" onClick={publicarMiCancha} disabled={publicando} className="btn btn-secundario btn-sm self-start">
                {publicando ? 'Publicando…' : 'Es mi cancha: publicarla en birteam'}
              </button>
              <p className="text-xs text-tinta-3">
                Queda como cancha de tu complejo, con turnos para reservar. El resto lo completás después.
              </p>
            </div>
          ) : null}
        </div>
      ) : null}

      {elegido && !canchaElegida ? (
        <Datos direccion={direccion} telefono={telefono} setDireccion={setDireccion} setTelefono={setTelefono} />
      ) : null}
    </section>
  );
}

function Datos({
  direccion,
  telefono,
  setDireccion,
  setTelefono,
}: {
  direccion: string;
  telefono: string;
  setDireccion: (texto: string) => void;
  setTelefono: (texto: string) => void;
}) {
  return (
    <>
      <div>
        <label className="rotulo-campo" htmlFor="direccion">
          Dirección · opcional
        </label>
        <input
          id="direccion"
          className="campo"
          placeholder="Av. del Libertador 4200"
          value={direccion}
          onChange={(evento) => setDireccion(evento.target.value)}
        />
      </div>
      <div>
        <label className="rotulo-campo" htmlFor="lugar-telefono">
          Teléfono o contacto · opcional
        </label>
        <input
          id="lugar-telefono"
          className="campo"
          placeholder="+54 9 11 5555-1234"
          value={telefono}
          onChange={(evento) => setTelefono(evento.target.value)}
        />
        <p className="mt-1 text-xs text-tinta-3">Se muestra en el partido, para reservar o avisar cualquier cosa.</p>
      </div>
    </>
  );
}
