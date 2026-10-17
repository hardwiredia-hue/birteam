'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const ORDEN = [1, 2, 3, 4, 5, 6, 0];

async function enviar(url: string, metodo: 'POST' | 'PATCH', cuerpo: unknown) {
  const respuesta = await fetch(url, {
    method: metodo,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cuerpo),
  });
  if (respuesta.ok) return null;
  return ((await respuesta.json().catch(() => ({}))).error as string) ?? 'No pudimos hacerlo. Probá de nuevo.';
}

/** El jugador pide un turno fijo (o ve el que tiene pendiente). */
export function PedirFijo({
  canchaId,
  dias,
  horarios,
  pendiente,
}: {
  canchaId: string;
  dias: number[];
  horarios: string[];
  pendiente: { id: string; diaSemana: number; hora: string } | null;
}) {
  const router = useRouter();
  const [, refrescar] = useTransition();
  const [abierto, setAbierto] = useState(false);
  const [diaSemana, setDiaSemana] = useState<number>(ORDEN.find((d) => dias.includes(d)) ?? 1);
  const [hora, setHora] = useState(horarios.includes('21:00') ? '21:00' : (horarios[0] ?? ''));
  const [nota, setNota] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function hacer(accion: () => Promise<string | null>) {
    setEnviando(true);
    setError(null);
    const fallo = await accion();
    setEnviando(false);
    if (fallo) {
      setError(fallo);
      return;
    }
    setAbierto(false);
    refrescar(() => router.refresh());
  }

  if (pendiente) {
    return (
      <section className="tarjeta flex items-center justify-between gap-3 p-4">
        <span className="min-w-0">
          <span className="block text-sm font-semibold">Pediste turno fijo</span>
          <span className="block text-xs text-tinta-3">
            Los {DIAS[pendiente.diaSemana].toLowerCase()} a las {pendiente.hora}: esperando que el complejo responda.
          </span>
          {error ? <span className="aviso-error mt-1 block">{error}</span> : null}
        </span>
        <button
          type="button"
          className="shrink-0 text-[13px] font-semibold text-tinta-3 hover:text-tinta"
          disabled={enviando}
          onClick={() => hacer(() => enviar(`/api/pedidos-fijo/${pendiente.id}`, 'PATCH', { accion: 'retirar' }))}
        >
          Retirar
        </button>
      </section>
    );
  }

  return (
    <section className="tarjeta flex flex-col gap-3 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">¿Juegan siempre el mismo día?</p>
          <p className="text-xs text-tinta-3">Pedí un turno fijo: el mismo día y hora todas las semanas, sin reservar cada vez.</p>
        </div>
        {!abierto ? (
          <button type="button" className="btn btn-secundario btn-sm shrink-0" onClick={() => setAbierto(true)}>
            Pedir fijo
          </button>
        ) : null}
      </div>
      {abierto ? (
        <div className="flex flex-col gap-3 border-t border-borde pt-3">
          <div className="grid grid-cols-2 gap-2">
            <label className="flex flex-col gap-1">
              <span className="rotulo-campo">Día</span>
              <select className="campo" value={diaSemana} onChange={(evento) => setDiaSemana(Number(evento.target.value))}>
                {ORDEN.filter((d) => dias.includes(d)).map((d) => (
                  <option key={d} value={d}>
                    {DIAS[d]}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="rotulo-campo">Hora</span>
              <select className="campo" value={hora} onChange={(evento) => setHora(evento.target.value)}>
                {horarios.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="flex flex-col gap-1">
            <span className="rotulo-campo">Para el complejo · opcional</span>
            <input
              className="campo"
              maxLength={200}
              placeholder="Somos 10, desde el mes que viene…"
              value={nota}
              onChange={(evento) => setNota(evento.target.value)}
            />
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              className="btn btn-secundario btn-sm"
              disabled={enviando || !hora}
              onClick={() => hacer(() => enviar(`/api/canchas/${canchaId}/pedidos-fijo`, 'POST', { diaSemana, hora, nota: nota.trim() || null }))}
            >
              {enviando ? 'Enviando…' : 'Mandar el pedido'}
            </button>
            <button type="button" className="btn btn-fantasma btn-sm" onClick={() => setAbierto(false)}>
              Cancelar
            </button>
          </div>
        </div>
      ) : null}
      {error ? <p className="aviso-error">{error}</p> : null}
    </section>
  );
}

/** El complejo ve los pedidos de turno fijo y los acepta o rechaza. */
export function PedidosFijoComplejo({
  pedidos,
}: {
  pedidos: { id: string; nombre: string; usuario: string; diaSemana: number; hora: string; nota: string | null; historial: string }[];
}) {
  const router = useRouter();
  const [, refrescar] = useTransition();
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  if (pedidos.length === 0) return null;

  async function responder(id: string, accion: 'aceptar' | 'rechazar') {
    setOcupado(id);
    setError(null);
    const fallo = await enviar(`/api/pedidos-fijo/${id}`, 'PATCH', { accion });
    setOcupado(null);
    if (fallo) {
      setError(fallo);
      return;
    }
    refrescar(() => router.refresh());
  }

  return (
    <section className="tarjeta flex flex-col gap-3 p-4" style={{ borderColor: 'var(--naranja-txt)' }}>
      <p className="t-rotulo text-naranja-txt">Piden turno fijo · {pedidos.length}</p>
      <ul className="flex flex-col">
        {pedidos.map((pedido) => (
          <li key={pedido.id} className="flex flex-col gap-2 border-t border-borde py-3 first:border-t-0 first:pt-0">
            <div>
              <p className="text-sm font-semibold">
                {DIAS[pedido.diaSemana]} {pedido.hora} · {pedido.nombre}
              </p>
              <p className="text-xs text-tinta-3">
                @{pedido.usuario} · {pedido.historial}
              </p>
              {pedido.nota ? <p className="mt-1 text-[13px] text-tinta-2">“{pedido.nota}”</p> : null}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                className="btn btn-secundario btn-sm"
                disabled={ocupado === pedido.id}
                onClick={() => responder(pedido.id, 'aceptar')}
              >
                Aceptar
              </button>
              <button
                type="button"
                className="btn btn-fantasma btn-sm"
                disabled={ocupado === pedido.id}
                onClick={() => responder(pedido.id, 'rechazar')}
              >
                No puedo
              </button>
            </div>
          </li>
        ))}
      </ul>
      {error ? <p className="aviso-error">{error}</p> : null}
    </section>
  );
}
