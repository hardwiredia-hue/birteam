'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { JugadaParaMostrar } from '@/lib/jugadas';

/** Publicar una jugada: hasta 5 fotos + texto. */
export function PublicarJugada({
  partidoId,
  grupoId,
  invitacion = '¿Cómo salió? Subí la jugada.',
}: {
  partidoId?: string;
  grupoId?: string;
  invitacion?: string;
}) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [texto, setTexto] = useState('');
  const [fotos, setFotos] = useState<{ nombre: string; url: string }[]>([]);
  const [subiendo, setSubiendo] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function elegirFotos(evento: React.ChangeEvent<HTMLInputElement>) {
    const elegidas = Array.from(evento.target.files ?? []).slice(0, 5 - fotos.length);
    if (elegidas.length === 0) return;
    setSubiendo(true);
    setError(null);
    for (const archivo of elegidas) {
      const form = new FormData();
      form.append('archivo', archivo);
      const respuesta = await fetch('/api/archivos', { method: 'POST', body: form });
      const datos = await respuesta.json().catch(() => ({}));
      if (!respuesta.ok) {
        setError(datos.error ?? 'No pudimos subir una foto.');
        break;
      }
      setFotos((previas) => [...previas, { nombre: datos.nombre, url: datos.url }]);
    }
    setSubiendo(false);
    evento.target.value = '';
  }

  async function publicar() {
    setEnviando(true);
    setError(null);
    const respuesta = await fetch('/api/jugadas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        texto: texto.trim() || null,
        fotos: fotos.map((foto) => foto.nombre),
        partidoId: partidoId ?? null,
        grupoId: grupoId ?? null,
      }),
    });
    setEnviando(false);
    if (!respuesta.ok) {
      const datos = await respuesta.json().catch(() => ({}));
      setError(datos.error ?? 'No pudimos publicar.');
      return;
    }
    setTexto('');
    setFotos([]);
    setAbierto(false);
    router.refresh();
  }

  if (!abierto) {
    return (
      <button type="button" className="btn btn-secundario" onClick={() => setAbierto(true)}>
        {invitacion}
      </button>
    );
  }

  return (
    <div className="tarjeta flex flex-col gap-3 p-4">
      <textarea
        id="texto-jugada"
        className="campo min-h-16 resize-y"
        placeholder="Contá la jugada… (opcional si subís fotos)"
        maxLength={500}
        value={texto}
        onChange={(evento) => setTexto(evento.target.value)}
      />

      {fotos.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {fotos.map((foto) => (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              key={foto.nombre}
              src={foto.url}
              alt=""
              className="h-16 w-16 rounded-[6px] border border-borde object-cover"
            />
          ))}
        </div>
      ) : null}

      <div className="flex items-center gap-3">
        <label className="btn btn-fantasma btn-sm cursor-pointer" htmlFor="fotos-jugada">
          {subiendo ? 'Subiendo…' : `Fotos (${fotos.length}/5)`}
          <input
            id="fotos-jugada"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            hidden
            onChange={elegirFotos}
            disabled={subiendo || fotos.length >= 5}
          />
        </label>
        <div className="flex-1" />
        <button type="button" className="btn btn-fantasma btn-sm" onClick={() => setAbierto(false)}>
          Cancelar
        </button>
        <button
          type="button"
          className="btn btn-primario btn-sm"
          onClick={publicar}
          disabled={enviando || subiendo || (fotos.length === 0 && !texto.trim())}
        >
          {enviando ? 'Publicando…' : 'Publicar'}
        </button>
      </div>
      {error ? <p className="aviso-error">{error}</p> : null}
    </div>
  );
}

/** La tarjeta de una jugada: fotos, autor, partido linkeado, me gusta y comentarios. */
export function TarjetaJugada({ jugada }: { jugada: JugadaParaMostrar }) {
  const router = useRouter();
  const [meGusta, setMeGusta] = useState(jugada.meGusta);
  const [total, setTotal] = useState(jugada.totalMeGusta);
  const [comentariosAbiertos, setComentariosAbiertos] = useState(false);
  const [comentarios, setComentarios] = useState<
    { id: string; texto: string; autor: { nombre: string; usuario: string } }[] | null
  >(null);
  const [nuevoComentario, setNuevoComentario] = useState(false);
  const [textoComentario, setTextoComentario] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function alternarMeGusta() {
    // Optimista: se siente instantáneo y el servidor corrige si hace falta.
    setMeGusta(!meGusta);
    setTotal(total + (meGusta ? -1 : 1));
    const respuesta = await fetch(`/api/jugadas/${jugada.id}/megusta`, { method: 'POST' });
    if (respuesta.ok) {
      const datos = await respuesta.json();
      setMeGusta(datos.meGusta);
      setTotal(datos.total);
    }
  }

  async function cargarComentarios() {
    setComentariosAbiertos(!comentariosAbiertos);
    if (comentarios === null) {
      const respuesta = await fetch(`/api/jugadas/${jugada.id}/comentarios`);
      const datos = await respuesta.json().catch(() => ({}));
      setComentarios(datos.comentarios ?? []);
    }
  }

  async function comentar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const limpio = textoComentario.trim();
    if (!limpio) return;
    setEnviando(true);
    const respuesta = await fetch(`/api/jugadas/${jugada.id}/comentarios`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ texto: limpio }),
    });
    setEnviando(false);
    if (respuesta.ok) {
      setTextoComentario('');
      const datos = await fetch(`/api/jugadas/${jugada.id}/comentarios`).then((r) => r.json());
      setComentarios(datos.comentarios ?? []);
      setNuevoComentario(false);
      router.refresh();
    }
  }

  return (
    <article className="tarjeta flex flex-col gap-3 p-4">
      <header className="flex items-baseline justify-between gap-3">
        <Link href={`/jugadores/${jugada.autor.usuario}`} className="text-sm font-semibold">
          {jugada.autor.nombre}
        </Link>
        <span className="t-rotulo">
          {new Date(jugada.creadoEn).toLocaleDateString('es-AR', {
            day: 'numeric',
            month: 'short',
            timeZone: 'America/Argentina/Buenos_Aires',
          })}
        </span>
      </header>

      {jugada.partido ? (
        <Link href={`/partidos/${jugada.partido.id}`} className="t-rotulo text-verde-txt">
          {jugada.partido.deporte} · {jugada.partido.lugar} →
        </Link>
      ) : null}

      {jugada.texto ? <p className="text-sm">{jugada.texto}</p> : null}

      {jugada.fotos.length > 0 ? (
        <div className={jugada.fotos.length === 1 ? '' : 'grid grid-cols-2 gap-1.5'}>
          {jugada.fotos.map((foto) => (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              key={foto}
              src={`/api/archivos/${foto}`}
              alt=""
              className="w-full rounded-[6px] border border-borde object-cover"
              style={{ maxHeight: jugada.fotos.length === 1 ? 420 : 180 }}
              loading="lazy"
            />
          ))}
        </div>
      ) : null}

      <footer className="flex items-center gap-4">
        <button
          type="button"
          onClick={alternarMeGusta}
          className="text-xs font-semibold"
          style={{ color: meGusta ? 'var(--verde-txt)' : 'var(--tinta-3)' }}
        >
          ▲ {total > 0 ? total : 'Me gusta'}
        </button>
        <button type="button" onClick={cargarComentarios} className="text-xs font-semibold text-tinta-3">
          {jugada.totalComentarios > 0 ? `${jugada.totalComentarios} comentarios` : 'Comentar'}
        </button>
      </footer>

      {comentariosAbiertos ? (
        <div className="flex flex-col gap-2 border-t border-borde pt-3">
          {comentarios === null ? (
            <p className="text-xs text-tinta-3">Cargando…</p>
          ) : (
            comentarios.map((comentario) => (
              <p key={comentario.id} className="text-sm">
                <Link href={`/jugadores/${comentario.autor.usuario}`} className="font-semibold">
                  {comentario.autor.nombre}
                </Link>{' '}
                <span className="text-tinta-2">{comentario.texto}</span>
              </p>
            ))
          )}
          {nuevoComentario ? (
            <form onSubmit={comentar} className="flex gap-2">
              <input
                id={`comentario-${jugada.id}`}
                className="campo"
                placeholder="Escribí un comentario…"
                maxLength={300}
                value={textoComentario}
                onChange={(evento) => setTextoComentario(evento.target.value)}
              />
              <button type="submit" className="btn btn-primario btn-sm" disabled={enviando || !textoComentario.trim()}>
                {enviando ? '…' : 'Enviar'}
              </button>
            </form>
          ) : (
            <button
              type="button"
              className="self-start text-xs font-semibold text-verde-txt"
              onClick={() => setNuevoComentario(true)}
            >
              Escribir un comentario
            </button>
          )}
        </div>
      ) : null}
    </article>
  );
}
