'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function Estrellas({ puntaje, tam = 14 }: { puntaje: number; tam?: number }) {
  return (
    <span className="tabular" style={{ fontSize: tam, letterSpacing: 1 }} aria-label={`${puntaje} de 5`}>
      <span className="text-naranja-txt">{'★'.repeat(Math.round(puntaje))}</span>
      <span className="text-tinta-3">{'★'.repeat(5 - Math.round(puntaje))}</span>
    </span>
  );
}

/** Dejar o editar la reseña propia. */
export function FormularioResena({
  canchaId,
  inicial,
}: {
  canchaId: string;
  inicial: { id: string; puntaje: number; texto: string | null } | null;
}) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(!inicial);
  const [puntaje, setPuntaje] = useState(inicial?.puntaje ?? 0);
  const [texto, setTexto] = useState(inicial?.texto ?? '');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function guardar() {
    setEnviando(true);
    setError(null);
    const respuesta = await fetch(`/api/canchas/${canchaId}/resenas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ puntaje, texto: texto.trim() || null }),
    });
    const datos = await respuesta.json().catch(() => ({}));
    setEnviando(false);
    if (!respuesta.ok) {
      setError(datos.error ?? 'No pudimos guardar la reseña.');
      return;
    }
    setAbierto(false);
    router.refresh();
  }

  async function borrar() {
    if (!inicial || !window.confirm('¿Borrar tu reseña?')) return;
    setEnviando(true);
    await fetch(`/api/resenas/${inicial.id}`, { method: 'DELETE' });
    setEnviando(false);
    setPuntaje(0);
    setTexto('');
    setAbierto(true);
    router.refresh();
  }

  if (!abierto) {
    return (
      <div className="flex gap-2">
        <button type="button" className="btn btn-secundario btn-sm" onClick={() => setAbierto(true)}>
          Editar mi reseña
        </button>
        <button type="button" className="btn btn-fantasma btn-sm" disabled={enviando} onClick={borrar}>
          Borrar
        </button>
      </div>
    );
  }

  return (
    <div className="tarjeta flex flex-col gap-3 p-4">
      <p className="text-sm font-semibold">{inicial ? 'Editá tu reseña' : '¿Qué tal la cancha?'}</p>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((valor) => (
          <button
            key={valor}
            type="button"
            aria-label={`${valor} estrellas`}
            onClick={() => setPuntaje(valor)}
            className="text-[28px] leading-none"
            style={{ color: valor <= puntaje ? 'var(--naranja-txt)' : 'var(--borde-2)' }}
          >
            ★
          </button>
        ))}
      </div>
      <textarea
        className="campo min-h-20"
        value={texto}
        maxLength={600}
        onChange={(evento) => setTexto(evento.target.value)}
        placeholder="Estado del césped, vestuarios, luz, atención… (opcional)"
      />
      {error ? <p className="aviso-error">{error}</p> : null}
      <div className="flex gap-2">
        <button
          type="button"
          className="btn btn-primario btn-sm"
          disabled={enviando || puntaje === 0}
          onClick={guardar}
        >
          {enviando ? 'Guardando…' : 'Publicar reseña'}
        </button>
        {inicial ? (
          <button type="button" className="btn btn-fantasma btn-sm" onClick={() => setAbierto(false)}>
            Cancelar
          </button>
        ) : null}
      </div>
    </div>
  );
}

/** El dueño responde una reseña. */
export function ResponderResena({ resenaId, respuesta }: { resenaId: string; respuesta: string | null }) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [texto, setTexto] = useState(respuesta ?? '');
  const [enviando, setEnviando] = useState(false);

  async function guardar() {
    setEnviando(true);
    await fetch(`/api/resenas/${resenaId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ respuesta: texto.trim() || null }),
    });
    setEnviando(false);
    setAbierto(false);
    router.refresh();
  }

  if (!abierto) {
    return (
      <button type="button" className="self-start text-xs font-semibold text-verde-txt" onClick={() => setAbierto(true)}>
        {respuesta ? 'Editar respuesta' : 'Responder'}
      </button>
    );
  }
  return (
    <div className="flex flex-col gap-2">
      <textarea
        className="campo min-h-16"
        value={texto}
        maxLength={600}
        onChange={(evento) => setTexto(evento.target.value)}
        placeholder="Tu respuesta como complejo"
      />
      <div className="flex gap-2">
        <button type="button" className="btn btn-primario btn-sm" disabled={enviando} onClick={guardar}>
          {enviando ? 'Guardando…' : 'Guardar'}
        </button>
        <button type="button" className="btn btn-fantasma btn-sm" onClick={() => setAbierto(false)}>
          Cancelar
        </button>
      </div>
    </div>
  );
}
