'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import type { JugadaParaMostrar } from '@/lib/jugadas';
import { Avatar } from '@/components/avatar';

/**
 * Feed vertical de clips: un video por pantalla, scroll con imán, autoplay
 * silenciado cuando el clip está a la vista (estilo TikTok, con la estética
 * de birteam). El sonido se prende con un toque en el parlante.
 */
export function FeedClips({ clips }: { clips: JugadaParaMostrar[] }) {
  const contenedor = useRef<HTMLDivElement>(null);
  const [conSonido, setConSonido] = useState(false);

  useEffect(() => {
    const raiz = contenedor.current;
    if (!raiz) return;
    const videos = Array.from(raiz.querySelectorAll('video'));
    const observador = new IntersectionObserver(
      (entradas) => {
        for (const entrada of entradas) {
          const video = entrada.target as HTMLVideoElement;
          if (entrada.intersectionRatio >= 0.6) {
            video.play().catch(() => {});
          } else {
            video.pause();
            video.currentTime = 0;
          }
        }
      },
      { root: raiz, threshold: [0, 0.6] }
    );
    videos.forEach((video) => observador.observe(video));
    return () => observador.disconnect();
  }, [clips.length]);

  useEffect(() => {
    contenedor.current
      ?.querySelectorAll('video')
      .forEach((video) => (video.muted = !conSonido));
  }, [conSonido]);

  return (
    <div
      ref={contenedor}
      className="h-dvh snap-y snap-mandatory overflow-y-auto bg-black"
      style={{ overscrollBehavior: 'contain' }}
    >
      {clips.map((clip) => (
        <Clip key={clip.id} clip={clip} conSonido={conSonido} alternarSonido={() => setConSonido(!conSonido)} />
      ))}
    </div>
  );
}

function Clip({
  clip,
  conSonido,
  alternarSonido,
}: {
  clip: JugadaParaMostrar;
  conSonido: boolean;
  alternarSonido: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [meGusta, setMeGusta] = useState(clip.meGusta);
  const [total, setTotal] = useState(clip.totalMeGusta);
  const [comentariosAbiertos, setComentariosAbiertos] = useState(false);
  const [comentarios, setComentarios] = useState<
    { id: string; texto: string; autor: { nombre: string; usuario: string } }[] | null
  >(null);
  const [textoComentario, setTextoComentario] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [totalComentarios, setTotalComentarios] = useState(clip.totalComentarios);

  async function alternarMeGusta() {
    setMeGusta(!meGusta);
    setTotal(total + (meGusta ? -1 : 1));
    const respuesta = await fetch(`/api/jugadas/${clip.id}/megusta`, { method: 'POST' });
    if (respuesta.ok) {
      const datos = await respuesta.json();
      setMeGusta(datos.meGusta);
      setTotal(datos.total);
    }
  }

  async function abrirComentarios() {
    setComentariosAbiertos(true);
    if (comentarios === null) {
      const respuesta = await fetch(`/api/jugadas/${clip.id}/comentarios`);
      const datos = await respuesta.json().catch(() => ({}));
      setComentarios(datos.comentarios ?? []);
    }
  }

  async function comentar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const limpio = textoComentario.trim();
    if (!limpio) return;
    setEnviando(true);
    const respuesta = await fetch(`/api/jugadas/${clip.id}/comentarios`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ texto: limpio }),
    });
    setEnviando(false);
    if (respuesta.ok) {
      setTextoComentario('');
      const datos = await fetch(`/api/jugadas/${clip.id}/comentarios`).then((r) => r.json());
      setComentarios(datos.comentarios ?? []);
      setTotalComentarios((datos.comentarios ?? []).length);
    }
  }

  function alternarReproduccion() {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) video.play().catch(() => {});
    else video.pause();
  }

  return (
    <section className="relative h-dvh w-full snap-start snap-always">
      {clip.videoUrl ? (
        <video
          ref={videoRef}
          src={clip.videoUrl}
          className="h-full w-full object-contain"
          loop
          muted
          playsInline
          preload="metadata"
          onClick={alternarReproduccion}
        />
      ) : clip.fotos.length > 1 ? (
        <div className="flex h-full w-full snap-x snap-mandatory overflow-x-auto">
          {clip.fotos.map((foto) => (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              key={foto}
              src={`/api/archivos/${foto}`}
              alt=""
              className="h-full w-full flex-shrink-0 snap-start object-contain"
            />
          ))}
        </div>
      ) : clip.fotos.length === 1 ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={`/api/archivos/${clip.fotos[0]}`}
          alt=""
          className="h-full w-full object-contain"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center px-10">
          <p className="t-display text-center text-[26px] text-white">{clip.texto}</p>
        </div>
      )}

      {/* Degradé para que el texto se lea sobre cualquier video. */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-52"
        style={{ background: 'linear-gradient(transparent, rgba(0,0,0,0.78))' }}
      />

      <button
        type="button"
        onClick={alternarSonido}
        className="absolute right-4 top-5 rounded-[6px] border border-white/25 bg-black/45 px-3 py-1.5 text-xs font-bold text-white"
      >
        {conSonido ? 'Sonido ✓' : 'Sin sonido'}
      </button>

      {/* Acciones a la derecha, alcanzables con el pulgar. */}
      <div className="absolute bottom-28 right-3 flex flex-col items-center gap-5">
        <button type="button" onClick={alternarMeGusta} className="flex flex-col items-center gap-1">
          <span
            className="flex h-11 w-11 items-center justify-center rounded-[6px] border text-lg font-bold"
            style={{
              background: meGusta ? 'var(--verde)' : 'rgba(0,0,0,0.45)',
              color: meGusta ? '#0b0d03' : '#fff',
              borderColor: meGusta ? 'var(--verde)' : 'rgba(255,255,255,0.25)',
            }}
          >
            ▲
          </span>
          <span className="text-xs font-bold text-white tabular">{total > 0 ? total : ''}</span>
        </button>
        <button type="button" onClick={abrirComentarios} className="flex flex-col items-center gap-1">
          <span className="flex h-11 w-11 items-center justify-center rounded-[6px] border border-white/25 bg-black/45 text-lg text-white">
            💬
          </span>
          <span className="text-xs font-bold text-white tabular">
            {totalComentarios > 0 ? totalComentarios : ''}
          </span>
        </button>
        {clip.publica ? (
          <button
            type="button"
            onClick={async () => {
              const url = `${window.location.origin}/j/${clip.id}`;
              try {
                if (navigator.share) await navigator.share({ title: 'Mirá esta jugada en birteam', url });
                else await navigator.clipboard.writeText(url);
              } catch {
                // Canceló el share: nada que hacer.
              }
            }}
            className="flex h-11 w-11 items-center justify-center rounded-[6px] border border-white/25 bg-black/45 text-lg text-white"
            aria-label="Compartir"
          >
            ↗
          </button>
        ) : null}
      </div>

      {/* Autor y texto abajo, por encima de la barra de navegación. */}
      <div className="absolute inset-x-0 bottom-0 flex flex-col gap-2 px-4 pb-24 pr-20">
        <Link
          href={`/jugadores/${clip.autor.usuario}`}
          className="flex items-center gap-2.5 text-sm font-bold text-white"
        >
          <Avatar nombre={clip.autor.nombre} avatarUrl={clip.autor.avatarUrl} tam={32} />
          {clip.autor.nombre}
        </Link>
        {clip.partido ? (
          <Link
            href={`/partidos/${clip.partido.id}`}
            className="t-rotulo"
            style={{ color: 'var(--verde)' }}
          >
            {clip.partido.deporte} · {clip.partido.lugar} →
          </Link>
        ) : null}
        {clip.torneo ? (
          <Link
            href={`/torneos/${clip.torneo.id}`}
            className="t-rotulo"
            style={{ color: '#f59e1e' }}
          >
            Torneo · {clip.torneo.nombre} →
          </Link>
        ) : null}
        {clip.cancha ? (
          <Link
            href={`/canchas/${clip.cancha.id}`}
            className="t-rotulo"
            style={{ color: '#f59e1e' }}
          >
            Cancha · {clip.cancha.nombre} →
          </Link>
        ) : null}
        {clip.texto && (clip.videoUrl || clip.fotos.length > 0) ? (
          <p className="text-sm text-white/90">{clip.texto}</p>
        ) : null}
      </div>

      {comentariosAbiertos ? (
        <div
          className="absolute inset-x-0 bottom-0 z-20 flex max-h-[60dvh] flex-col rounded-t-[12px] border-t border-borde-2 bg-panel"
          style={{ paddingBottom: 64 }}
        >
          <div className="flex items-center justify-between px-4 py-3">
            <p className="t-rotulo">Comentarios</p>
            <button
              type="button"
              onClick={() => setComentariosAbiertos(false)}
              className="text-sm font-bold text-tinta-3"
            >
              Cerrar ✕
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-4 pb-3">
            {comentarios === null ? (
              <p className="text-xs text-tinta-3">Cargando…</p>
            ) : comentarios.length === 0 ? (
              <p className="text-xs text-tinta-3">Sé el primero en comentar.</p>
            ) : (
              comentarios.map((comentario) => (
                <p key={comentario.id} className="py-1 text-sm">
                  <Link href={`/jugadores/${comentario.autor.usuario}`} className="font-semibold">
                    {comentario.autor.nombre}
                  </Link>{' '}
                  <span className="text-tinta-2">{comentario.texto}</span>
                </p>
              ))
            )}
          </div>
          <form onSubmit={comentar} className="flex gap-2 border-t border-borde px-4 py-3">
            <input
              className="campo flex-1"
              placeholder="Escribí un comentario…"
              maxLength={300}
              value={textoComentario}
              onChange={(evento) => setTextoComentario(evento.target.value)}
            />
            <button type="submit" className="btn btn-primario btn-sm" disabled={enviando}>
              {enviando ? '…' : 'Mandar'}
            </button>
          </form>
        </div>
      ) : null}
    </section>
  );
}
