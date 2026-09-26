'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';

interface Mensaje {
  id: string;
  texto: string;
  creadoEn: string;
  autor: { id: string; nombre: string; usuario: string };
  mio: boolean;
}

/**
 * Chat de partido o de grupo. Refresca solo cada 8 segundos mientras la
 * pestaña está visible.
 */
export function Chat({ partidoId, grupoId }: { partidoId?: string; grupoId?: string }) {
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fondo = useRef<HTMLDivElement>(null);
  const clave = partidoId ? `partidoId=${partidoId}` : `grupoId=${grupoId}`;

  const cargar = useCallback(async () => {
    try {
      const respuesta = await fetch(`/api/mensajes?${clave}`);
      if (!respuesta.ok) return;
      const datos = await respuesta.json();
      setMensajes((previos) => {
        const nuevos: Mensaje[] = datos.mensajes ?? [];
        // Solo re-renderizar (y hacer scroll) cuando hay algo nuevo.
        return nuevos.length !== previos.length ? nuevos : previos;
      });
    } catch {
      // Sin red un momento: el próximo intento lo resuelve.
    }
  }, [clave]);

  useEffect(() => {
    cargar();
    const intervalo = setInterval(() => {
      if (document.visibilityState === 'visible') cargar();
    }, 8000);
    return () => clearInterval(intervalo);
  }, [cargar]);

  useEffect(() => {
    fondo.current?.scrollTo({ top: fondo.current.scrollHeight });
  }, [mensajes]);

  async function enviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const limpio = texto.trim();
    if (!limpio || enviando) return;
    setEnviando(true);
    setError(null);

    const respuesta = await fetch('/api/mensajes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ texto: limpio, partidoId: partidoId ?? null, grupoId: grupoId ?? null }),
    });
    if (respuesta.ok) {
      setTexto('');
      await cargar();
    } else {
      const datos = await respuesta.json().catch(() => ({}));
      setError(datos.error ?? 'No salió el mensaje. Probá de nuevo.');
    }
    setEnviando(false);
  }

  return (
    <div className="tarjeta flex flex-col overflow-hidden">
      <div ref={fondo} className="flex max-h-72 min-h-24 flex-col gap-2.5 overflow-y-auto p-3.5">
        {mensajes.length === 0 ? (
          <p className="py-4 text-center text-xs text-tinta-3">
            Todavía no hay mensajes. Rompé el hielo.
          </p>
        ) : (
          mensajes.map((mensaje) => (
            <div key={mensaje.id} className={mensaje.mio ? 'ml-8 text-right' : 'mr-8'}>
              {!mensaje.mio ? (
                <Link
                  href={`/jugadores/${mensaje.autor.usuario}`}
                  className="mb-0.5 block text-[11px] font-semibold text-tinta-3"
                >
                  {mensaje.autor.nombre}
                </Link>
              ) : null}
              <p
                className="inline-block rounded-[6px] px-3 py-1.5 text-left text-sm"
                style={{
                  background: mensaje.mio ? 'rgba(168,230,23,0.12)' : 'var(--fondo)',
                  border: '1px solid var(--borde)',
                }}
              >
                {mensaje.texto}
              </p>
            </div>
          ))
        )}
      </div>
      {error ? <p className="px-3.5 pb-1 text-xs text-rojo">{error}</p> : null}
      <form onSubmit={enviar} className="flex gap-2 border-t border-borde p-2.5">
        <input
          id={`chat-${partidoId ?? grupoId}`}
          className="campo"
          placeholder="Escribí un mensaje…"
          value={texto}
          maxLength={500}
          onChange={(evento) => setTexto(evento.target.value)}
        />
        <button type="submit" className="btn btn-primario btn-sm" disabled={enviando || !texto.trim()}>
          Enviar
        </button>
      </form>
    </div>
  );
}
