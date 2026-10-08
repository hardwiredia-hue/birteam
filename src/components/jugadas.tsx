'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { JugadaParaMostrar } from '@/lib/jugadas';
import { Avatar } from '@/components/avatar';

/** Publicar una jugada: hasta 5 fotos + texto. */
export function PublicarJugada({
  partidoId,
  grupoId,
  torneoId,
  canchaId,
  adjunto,
  caja = false,
  invitacion = '¿Cómo salió? Subí la jugada.',
}: {
  partidoId?: string;
  grupoId?: string;
  torneoId?: string;
  canchaId?: string;
  /** Rótulo de lo que se comparte (p. ej. "Torneo · Copa de los Lunes"). */
  adjunto?: string;
  /** Caja de red social ("¿Qué pasó en la cancha?" + atajos Foto/Video). */
  caja?: boolean;
  invitacion?: string;
}) {
  const router = useRouter();
  // Si viene con algo para compartir, el editor ya arranca abierto.
  const [abierto, setAbierto] = useState(Boolean(adjunto));
  // Atajo Foto/Video de la caja: abre el editor y dispara el selector.
  const [autoAbrir, setAutoAbrir] = useState<'foto' | 'video' | null>(null);

  useEffect(() => {
    if (!abierto || !autoAbrir) return;
    const id = autoAbrir === 'foto' ? 'fotos-jugada' : 'video-jugada';
    (document.getElementById(id) as HTMLInputElement | null)?.click();
    setAutoAbrir(null);
  }, [abierto, autoAbrir]);
  const [texto, setTexto] = useState('');
  const [fotos, setFotos] = useState<{ nombre: string; url: string }[]>([]);
  const [video, setVideo] = useState<{ nombre: string; url: string } | null>(null);
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

  async function elegirVideo(evento: React.ChangeEvent<HTMLInputElement>) {
    const archivo = evento.target.files?.[0];
    evento.target.value = '';
    if (!archivo) return;
    setSubiendo(true);
    setError(null);
    const form = new FormData();
    form.append('archivo', archivo);
    const respuesta = await fetch('/api/archivos/video', { method: 'POST', body: form });
    const datos = await respuesta.json().catch(() => ({}));
    setSubiendo(false);
    if (!respuesta.ok) {
      setError(datos.error ?? 'No pudimos subir el video.');
      return;
    }
    setVideo({ nombre: datos.nombre, url: datos.url });
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
        video: video?.nombre ?? null,
        partidoId: partidoId ?? null,
        grupoId: grupoId ?? null,
        torneoId: torneoId ?? null,
        canchaId: canchaId ?? null,
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
    setVideo(null);
    setAbierto(false);
    router.refresh();
  }

  if (!abierto) {
    if (caja) {
      return (
        <div className="tarjeta flex flex-col gap-3 p-4">
          <button
            type="button"
            onClick={() => setAbierto(true)}
            className="campo text-left"
            style={{ color: 'var(--tinta-3)' }}
          >
            ¿Qué pasó en la cancha?
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              className="btn btn-fantasma btn-sm flex-1"
              onClick={() => {
                setAutoAbrir('foto');
                setAbierto(true);
              }}
            >
              Subir foto
            </button>
            <button
              type="button"
              className="btn btn-fantasma btn-sm flex-1"
              onClick={() => {
                setAutoAbrir('video');
                setAbierto(true);
              }}
            >
              Subir video
            </button>
          </div>
        </div>
      );
    }
    return (
      <button type="button" className="btn btn-secundario" onClick={() => setAbierto(true)}>
        {invitacion}
      </button>
    );
  }

  return (
    <div className="tarjeta flex flex-col gap-3 p-4">
      {adjunto ? <p className="t-rotulo text-naranja-txt">Compartís: {adjunto}</p> : null}
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

      {video ? (
        <div className="flex items-center gap-3">
          <video
            src={video.url}
            className="h-24 rounded-[6px] border border-borde"
            muted
            playsInline
            preload="metadata"
          />
          <button
            type="button"
            className="text-xs font-semibold text-tinta-3"
            onClick={() => setVideo(null)}
          >
            Quitar video
          </button>
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
        {!video ? (
          <label className="btn btn-fantasma btn-sm cursor-pointer" htmlFor="video-jugada">
            Video
            <input
              id="video-jugada"
              type="file"
              accept="video/mp4,video/webm,video/quicktime"
              hidden
              onChange={elegirVideo}
              disabled={subiendo}
            />
          </label>
        ) : null}
        <div className="flex-1" />
        <button type="button" className="btn btn-fantasma btn-sm" onClick={() => setAbierto(false)}>
          Cancelar
        </button>
        <button
          type="button"
          className="btn btn-primario btn-sm"
          onClick={publicar}
          disabled={
            enviando ||
            subiendo ||
            (fotos.length === 0 && !video && !texto.trim() && !torneoId && !canchaId)
          }
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
  // null = se muestran los últimos que vinieron con el feed; lista = todos.
  const [comentarios, setComentarios] = useState<
    { id: string; texto: string; autor: { nombre: string; usuario: string } }[] | null
  >(null);
  const [totalComentarios, setTotalComentarios] = useState(jugada.totalComentarios);
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

  async function verTodosLosComentarios() {
    const respuesta = await fetch(`/api/jugadas/${jugada.id}/comentarios`);
    const datos = await respuesta.json().catch(() => ({}));
    setComentarios(datos.comentarios ?? []);
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
      setTotalComentarios((datos.comentarios ?? []).length);
      router.refresh();
    }
  }

  return (
    <article className="tarjeta flex flex-col gap-3 p-4">
      <header className="flex items-center justify-between gap-3">
        <Link href={`/jugadores/${jugada.autor.usuario}`} className="flex items-center gap-2.5 text-sm font-semibold">
          <Avatar nombre={jugada.autor.nombre} avatarUrl={jugada.autor.avatarUrl} tam={28} />
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

      {jugada.torneo ? (
        <Link
          href={`/torneos/${jugada.torneo.id}`}
          className="tarjeta block p-3 transition-colors hover:border-borde-2"
        >
          <span className="t-rotulo text-naranja-txt">Torneo · {jugada.torneo.deporte}</span>
          <span className="mt-0.5 block text-sm font-semibold">{jugada.torneo.nombre} →</span>
        </Link>
      ) : null}

      {jugada.cancha ? (
        <Link
          href={`/canchas/${jugada.cancha.id}`}
          className="tarjeta block p-3 transition-colors hover:border-borde-2"
        >
          <span className="t-rotulo text-naranja-txt">Cancha · {jugada.cancha.deporte}</span>
          <span className="mt-0.5 block text-sm font-semibold">{jugada.cancha.nombre} →</span>
        </Link>
      ) : null}

      {jugada.texto ? <p className="text-sm">{jugada.texto}</p> : null}

      {jugada.videoUrl ? (
        <video
          src={jugada.videoUrl}
          className="w-full rounded-[6px] border border-borde bg-black"
          style={{ maxHeight: 480 }}
          controls
          playsInline
          preload="metadata"
        />
      ) : null}

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
        <span className="text-xs font-semibold text-tinta-3 tabular">
          {totalComentarios > 0
            ? `${totalComentarios} ${totalComentarios === 1 ? 'comentario' : 'comentarios'}`
            : ''}
        </span>
        <div className="flex-1" />
        {jugada.publica ? <CompartirJugada jugadaId={jugada.id} /> : null}
      </footer>

      {/* Comentarios a la vista + cajita siempre lista, como en cualquier red. */}
      <div className="flex flex-col gap-2 border-t border-borde pt-3">
        {comentarios === null && totalComentarios > jugada.ultimosComentarios.length ? (
          <button
            type="button"
            className="self-start text-xs font-semibold text-tinta-3"
            onClick={verTodosLosComentarios}
          >
            Ver los {totalComentarios} comentarios
          </button>
        ) : null}
        {(comentarios ?? jugada.ultimosComentarios).map((comentario) => (
          <p key={comentario.id} className="text-sm">
            <Link href={`/jugadores/${comentario.autor.usuario}`} className="font-semibold">
              {comentario.autor.nombre}
            </Link>{' '}
            <span className="text-tinta-2">{comentario.texto}</span>
          </p>
        ))}
        <form onSubmit={comentar} className="flex gap-2">
          <input
            id={`comentario-${jugada.id}`}
            className="campo"
            placeholder="Agregá un comentario…"
            maxLength={300}
            value={textoComentario}
            onChange={(evento) => setTextoComentario(evento.target.value)}
          />
          {textoComentario.trim() ? (
            <button type="submit" className="btn btn-primario btn-sm" disabled={enviando}>
              {enviando ? '…' : 'Mandar'}
            </button>
          ) : null}
        </form>
      </div>
    </article>
  );
}

/** Compartir la jugada afuera (WhatsApp y demás) con su link público. */
function CompartirJugada({ jugadaId }: { jugadaId: string }) {
  const [copiado, setCopiado] = useState(false);

  async function compartir() {
    const url = `${window.location.origin}/j/${jugadaId}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Mirá esta jugada en birteam', url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      // Canceló el share: nada que hacer.
    }
  }

  return (
    <button type="button" onClick={compartir} className="text-xs font-semibold text-tinta-3">
      {copiado ? 'Link copiado ✓' : 'Compartir'}
    </button>
  );
}
