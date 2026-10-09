'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { DiaDeGrilla, TurnoDeGrilla } from '@/lib/reservas';

const ROTULO_MIO: Record<string, string> = {
  SOLICITADA: 'Pedido',
  CONFIRMADA: 'Tuyo',
};

const ROTULO_DETALLE: Record<string, string> = {
  SOLICITADA: 'Pide el turno (sin confirmar)',
  CONFIRMADA: 'Turno confirmado',
  BLOQUEO: 'Bloqueado por vos',
};

/**
 * Grilla de turnos de una cancha: días arriba, horarios abajo. Lo libre es
 * lo que de verdad está libre en la base; nada de disponibilidad inventada.
 * El jugador pide; el dueño bloquea, confirma, rechaza o libera.
 */
export function GrillaTurnos({
  canchaId,
  dias,
  esDueno,
  precioTurno,
  duracion,
  telefono,
}: {
  canchaId: string;
  dias: DiaDeGrilla[];
  esDueno: boolean;
  /** Ya formateado ("$12.000") o null si la cancha no publica precio. */
  precioTurno: string | null;
  duracion: number;
  telefono: string | null;
}) {
  const router = useRouter();
  const primerDiaConLibres = dias.findIndex((dia) => dia.turnos.some((t) => t.estado === 'LIBRE'));
  const [indiceDia, setIndiceDia] = useState(Math.max(0, primerDiaConLibres));
  const [elegido, setElegido] = useState<TurnoDeGrilla | null>(null);
  const [nota, setNota] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const dia = dias[indiceDia];
  const visibles = dia.turnos.filter((turno) => esDueno || turno.estado !== 'PASADO');

  function elegirDia(indice: number) {
    setIndiceDia(indice);
    setElegido(null);
    setError(null);
  }

  function elegirTurno(turno: TurnoDeGrilla) {
    setElegido(elegido?.hora === turno.hora ? null : turno);
    setNota('');
    setError(null);
    setAviso(null);
  }

  async function pedir() {
    if (!elegido) return;
    setEnviando(true);
    setError(null);
    const respuesta = await fetch(`/api/canchas/${canchaId}/reservas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fecha: dia.fecha, hora: elegido.hora, nota: nota.trim() || null }),
    });
    const datos = await respuesta.json().catch(() => ({}));
    setEnviando(false);
    if (!respuesta.ok) {
      setError(datos.error ?? 'No pudimos pedir el turno.');
      router.refresh();
      return;
    }
    setAviso(
      esDueno
        ? `Bloqueaste el ${dia.rotulo} a las ${elegido.hora}.`
        : `Listo: pediste el ${dia.rotulo} a las ${elegido.hora}. Te avisamos cuando el complejo confirme.`
    );
    setElegido(null);
    router.refresh();
  }

  async function responder(accion: 'confirmar' | 'rechazar' | 'cancelar') {
    if (!elegido?.reservaId) return;
    setEnviando(true);
    setError(null);
    const respuesta = await fetch(`/api/reservas/${elegido.reservaId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accion, motivo: nota.trim() || null }),
    });
    const datos = await respuesta.json().catch(() => ({}));
    setEnviando(false);
    if (!respuesta.ok) {
      setError(datos.error ?? 'No pudimos hacer el cambio.');
      router.refresh();
      return;
    }
    setAviso(
      accion === 'confirmar'
        ? 'Turno confirmado. Le avisamos al jugador.'
        : accion === 'rechazar'
          ? 'Pedido rechazado: el turno vuelve a estar libre.'
          : 'Turno liberado.'
    );
    setElegido(null);
    router.refresh();
  }

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-col gap-0.5">
        <p className="t-rotulo">
          Turnos de {duracion === 60 ? '1 hora' : duracion === 90 ? '1 h 30' : '2 horas'}
        </p>
        {precioTurno ? (
          <p className="text-xs text-tinta-3">{precioTurno} el turno · se paga en el complejo</p>
        ) : null}
      </div>

      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {dias.map((otro, indice) => {
          const libres = otro.turnos.filter((t) => t.estado === 'LIBRE').length;
          const activo = indice === indiceDia;
          return (
            <button
              key={otro.fecha}
              type="button"
              onClick={() => elegirDia(indice)}
              className={activo ? 'chip-sel chip-sel-activo shrink-0' : 'chip-sel shrink-0'}
              style={!otro.abierto && !activo ? { opacity: 0.45 } : undefined}
            >
              <span className="flex flex-col items-center leading-tight">
                <span>{otro.rotulo}</span>
                <span className="text-[10px] font-normal opacity-80">
                  {otro.abierto ? `${libres} libre${libres === 1 ? '' : 's'}` : 'Cerrado'}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {!dia.abierto ? (
        <p className="tarjeta p-4 text-sm text-tinta-2">La cancha no abre este día.</p>
      ) : visibles.length === 0 ? (
        <p className="tarjeta p-4 text-sm text-tinta-2">
          No quedan turnos para hoy. Mirá los próximos días.
        </p>
      ) : (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4" data-grilla-turnos>
          {visibles.map((turno) => {
            const seleccionado = elegido?.hora === turno.hora;
            const clickeable =
              turno.estado === 'LIBRE' ||
              turno.estado === 'MIA' ||
              (esDueno && turno.estado === 'OCUPADO' && Boolean(turno.reservaId));
            let estilo: React.CSSProperties = {};
            let rotulo = 'Libre';
            if (turno.estado === 'OCUPADO') {
              rotulo = esDueno && turno.detalle ? (turno.detalle.estado === 'SOLICITADA' ? 'Pedido' : turno.detalle.estado === 'BLOQUEO' ? 'Bloqueado' : 'Reservado') : 'Ocupado';
              estilo =
                esDueno && turno.detalle?.estado === 'SOLICITADA'
                  ? { borderColor: 'var(--naranja-txt)', color: 'var(--naranja-txt)' }
                  : { color: 'var(--gris-estado)', textDecoration: esDueno ? undefined : 'line-through' };
            } else if (turno.estado === 'PASADO') {
              rotulo = 'Pasado';
              estilo = { opacity: 0.4 };
            } else if (turno.estado === 'MIA') {
              rotulo = ROTULO_MIO[turno.estadoMio ?? ''] ?? 'Tuyo';
              estilo = { borderColor: 'var(--naranja-txt)', color: 'var(--naranja-txt)' };
            } else {
              estilo = { borderColor: 'var(--verde-txt)', color: 'var(--verde-txt)' };
            }
            if (seleccionado) {
              estilo = { ...estilo, background: 'rgba(168,230,23,0.12)', outline: '2px solid var(--verde-txt)' };
            }
            return (
              <button
                key={turno.hora}
                type="button"
                disabled={!clickeable}
                onClick={() => elegirTurno(turno)}
                className="flex flex-col items-center rounded-[6px] border border-borde-2 px-2 py-2.5 disabled:cursor-default"
                style={estilo}
              >
                <span className="text-[15px] font-bold tabular">{turno.hora}</span>
                <span className="text-[10.5px] font-semibold uppercase tracking-wide">{rotulo}</span>
              </button>
            );
          })}
        </div>
      )}

      {elegido ? (
        <div className="tarjeta flex flex-col gap-3 p-4">
          <p className="text-sm font-semibold">
            {dia.rotulo} · {elegido.hora}
          </p>

          {elegido.estado === 'LIBRE' ? (
            <>
              <p className="text-xs text-tinta-3">
                {esDueno
                  ? 'Bloquealo si lo reservaron por teléfono o la cancha no va a estar disponible.'
                  : `El complejo confirma el pedido (tiene hasta 12 h). ${precioTurno ? `${precioTurno}, ` : ''}se paga allá.`}
              </p>
              <input
                className="campo"
                value={nota}
                onChange={(evento) => setNota(evento.target.value)}
                maxLength={200}
                placeholder={esDueno ? 'Nota (ej: reservó Juan por teléfono)' : 'Nota para el complejo (opcional)'}
              />
              <button type="button" className="btn btn-primario" disabled={enviando} onClick={pedir}>
                {enviando ? 'Enviando…' : esDueno ? 'Bloquear el turno' : 'Pedir este turno'}
              </button>
            </>
          ) : null}

          {elegido.estado === 'MIA' ? (
            <>
              <p className="text-xs text-tinta-3">
                {elegido.estadoMio === 'CONFIRMADA'
                  ? 'Turno confirmado. Si no van, cancelalo con tiempo así lo aprovecha otro.'
                  : 'Esperando que el complejo confirme.'}
              </p>
              <div className="flex flex-wrap gap-2">
                {elegido.estadoMio === 'CONFIRMADA' ? (
                  <Link
                    href={`/crear?cancha=${canchaId}&fecha=${dia.fecha}&hora=${elegido.hora}&reserva=${elegido.reservaId}`}
                    className="btn btn-primario btn-sm"
                  >
                    Armar el partido
                  </Link>
                ) : null}
                <button
                  type="button"
                  className="btn btn-secundario btn-sm"
                  disabled={enviando}
                  onClick={() => responder('cancelar')}
                >
                  {elegido.estadoMio === 'CONFIRMADA' ? 'Cancelar el turno' : 'Cancelar el pedido'}
                </button>
              </div>
            </>
          ) : null}

          {esDueno && elegido.estado === 'OCUPADO' && elegido.detalle ? (
            <>
              <p className="text-xs text-tinta-3">
                {ROTULO_DETALLE[elegido.detalle.estado] ?? elegido.detalle.estado}
                {elegido.detalle.estado !== 'BLOQUEO' ? (
                  <>
                    {' · '}
                    <Link href={`/jugadores/${elegido.detalle.usuario}`} className="font-semibold text-tinta">
                      {elegido.detalle.nombre}
                    </Link>
                  </>
                ) : null}
                {elegido.detalle.nota ? ` · “${elegido.detalle.nota}”` : ''}
              </p>
              {elegido.detalle.estado !== 'BLOQUEO' ? (
                <input
                  className="campo"
                  value={nota}
                  onChange={(evento) => setNota(evento.target.value)}
                  maxLength={200}
                  placeholder="Motivo (opcional, se lo mandamos al jugador)"
                />
              ) : null}
              <div className="flex flex-wrap gap-2">
                {elegido.detalle.estado === 'SOLICITADA' ? (
                  <>
                    <button type="button" className="btn btn-primario btn-sm" disabled={enviando} onClick={() => responder('confirmar')}>
                      Confirmar
                    </button>
                    <button type="button" className="btn btn-secundario btn-sm" disabled={enviando} onClick={() => responder('rechazar')}>
                      Rechazar
                    </button>
                  </>
                ) : (
                  <button type="button" className="btn btn-secundario btn-sm" disabled={enviando} onClick={() => responder('cancelar')}>
                    {elegido.detalle.estado === 'BLOQUEO' ? 'Liberar el turno' : 'Cancelar el turno'}
                  </button>
                )}
                <Link href="/reservas" className="btn btn-fantasma btn-sm">
                  Ver todas
                </Link>
              </div>
            </>
          ) : null}

          {error ? <p className="aviso-error">{error}</p> : null}
        </div>
      ) : null}

      {aviso ? <p className="aviso-ok">{aviso}</p> : null}
      {!elegido && error ? <p className="aviso-error">{error}</p> : null}

      {!esDueno && telefono ? (
        <p className="text-xs text-tinta-3">
          ¿Para hoy o urgente?{' '}
          <a href={`tel:${telefono.replace(/[^+0-9]/g, '')}`} className="font-semibold text-tinta-2">
            Llamá al {telefono}
          </a>
        </p>
      ) : null}
    </section>
  );
}
