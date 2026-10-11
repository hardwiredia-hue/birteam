'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
// De lunes a domingo, como se lee un calendario.
const ORDEN = [1, 2, 3, 4, 5, 6, 0];

export interface FijoListado {
  id: string;
  diaSemana: number;
  hora: string;
  titular: string;
  usuario: string | null;
  telefono: string | null;
  nota: string | null;
  /** Próxima semana tomada ("Mar 14 oct"), si hay. */
  proxima: string | null;
}

/**
 * Turnos fijos de la cancha: el mismo horario todas las semanas para un
 * equipo o un cliente. Lo gestiona el complejo (dueño o empleados).
 */
export function TurnosFijos({
  canchaId,
  fijos,
  dias,
  horarios,
}: {
  canchaId: string;
  fijos: FijoListado[];
  /** Días en que abre la cancha (0=domingo). */
  dias: number[];
  horarios: string[];
}) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [diaSemana, setDiaSemana] = useState<number>(ORDEN.find((d) => dias.includes(d)) ?? 1);
  const [hora, setHora] = useState(horarios.includes('21:00') ? '21:00' : (horarios[0] ?? ''));
  const [titular, setTitular] = useState('');
  const [usuario, setUsuario] = useState('');
  const [telefono, setTelefono] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<string | null>(null);

  const ocupados = new Set(fijos.map((f) => `${f.diaSemana}|${f.hora}`));

  async function crear(evento: React.FormEvent) {
    evento.preventDefault();
    setEnviando(true);
    setError(null);
    setResultado(null);
    const respuesta = await fetch(`/api/canchas/${canchaId}/fijos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ diaSemana, hora, titular, usuario: usuario || null, telefono: telefono || null }),
    });
    const datos = await respuesta.json().catch(() => ({}));
    setEnviando(false);
    if (!respuesta.ok) {
      setError(datos.detalles ? Object.values(datos.detalles).join(' ') : (datos.error ?? 'No se pudo guardar.'));
      return;
    }
    const tomadas: string[] = datos.tomadas ?? [];
    setResultado(
      tomadas.length > 0
        ? `Listo. Ojo: ${tomadas.length === 1 ? 'una semana ya estaba tomada' : `${tomadas.length} semanas ya estaban tomadas`} (${tomadas.join(', ')}); esas no se reservaron.`
        : 'Listo: el turno queda tomado todas las semanas.'
    );
    setTitular('');
    setUsuario('');
    setTelefono('');
    setAbierto(false);
    router.refresh();
  }

  async function terminar(fijo: FijoListado) {
    if (
      !window.confirm(
        `¿Terminar el turno fijo de ${fijo.titular} (${DIAS[fijo.diaSemana].toLowerCase()} ${fijo.hora})? Se liberan las semanas que vienen.`
      )
    )
      return;
    const respuesta = await fetch(`/api/canchas/${canchaId}/fijos`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: fijo.id }),
    });
    if (!respuesta.ok) {
      const datos = await respuesta.json().catch(() => ({}));
      setError(datos.error ?? 'No se pudo terminar.');
      return;
    }
    router.refresh();
  }

  return (
    <section className="tarjeta flex flex-col gap-3 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">Turnos fijos</p>
          <p className="text-xs text-tinta-3">
            El mismo horario todas las semanas. Se reserva solo, semana a semana; si una semana no
            vienen, cancelás esa sola desde la grilla.
          </p>
        </div>
        {!abierto ? (
          <button type="button" className="btn btn-secundario btn-sm shrink-0" onClick={() => setAbierto(true)}>
            + Nuevo
          </button>
        ) : null}
      </div>

      {fijos.length > 0 ? (
        <div className="flex flex-col">
          {[...fijos]
            .sort((a, b) => ORDEN.indexOf(a.diaSemana) - ORDEN.indexOf(b.diaSemana) || a.hora.localeCompare(b.hora))
            .map((fijo) => (
              <div key={fijo.id} className="flex items-start justify-between gap-3 border-b border-borde py-2.5 last:border-b-0">
                <div className="min-w-0 text-sm">
                  <p className="font-semibold">
                    {DIAS[fijo.diaSemana]} {fijo.hora} · {fijo.titular}
                  </p>
                  <p className="text-xs text-tinta-3">
                    {fijo.usuario ? `@${fijo.usuario}` : 'sin cuenta en birteam'}
                    {fijo.telefono ? ` · ${fijo.telefono}` : ''}
                    {fijo.proxima ? ` · próxima: ${fijo.proxima}` : ''}
                  </p>
                </div>
                <button type="button" className="shrink-0 text-xs font-semibold text-tinta-3" onClick={() => terminar(fijo)}>
                  Terminar
                </button>
              </div>
            ))}
        </div>
      ) : !abierto ? (
        <p className="text-xs text-tinta-2">Todavía no armaste ninguno.</p>
      ) : null}

      {abierto ? (
        <form onSubmit={crear} className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs text-tinta-3">
              Día
              <select className="campo mt-1" value={diaSemana} onChange={(e) => setDiaSemana(Number(e.target.value))}>
                {ORDEN.filter((d) => dias.includes(d)).map((d) => (
                  <option key={d} value={d}>
                    {DIAS[d]}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs text-tinta-3">
              Horario
              <select className="campo mt-1" value={hora} onChange={(e) => setHora(e.target.value)}>
                {horarios.map((h) => (
                  <option key={h} value={h} disabled={ocupados.has(`${diaSemana}|${h}`)}>
                    {h}
                    {ocupados.has(`${diaSemana}|${h}`) ? ' (ya es fijo)' : ''}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="text-xs text-tinta-3">
            A nombre de
            <input
              className="campo mt-1"
              value={titular}
              onChange={(e) => setTitular(e.target.value)}
              placeholder="Los Pibes del martes"
              maxLength={60}
            />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs text-tinta-3">
              @usuario (opcional)
              <input
                className="campo mt-1"
                value={usuario}
                onChange={(e) => setUsuario(e.target.value)}
                placeholder="@capitan"
                autoComplete="off"
              />
            </label>
            <label className="text-xs text-tinta-3">
              Teléfono (opcional)
              <input
                className="campo mt-1"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                inputMode="tel"
                maxLength={30}
              />
            </label>
          </div>
          <p className="text-xs text-tinta-3">
            Con @usuario, el turno le aparece en sus reservas y puede avisar si una semana no va.
          </p>
          <div className="flex gap-2">
            <button type="submit" className="btn btn-primario btn-sm" disabled={enviando || titular.trim().length < 2 || !hora}>
              {enviando ? 'Guardando…' : 'Guardar turno fijo'}
            </button>
            <button type="button" className="btn btn-fantasma btn-sm" onClick={() => setAbierto(false)}>
              Cancelar
            </button>
          </div>
        </form>
      ) : null}

      {resultado ? <p className="aviso-ok">{resultado}</p> : null}
      {error ? <p className="aviso-error">{error}</p> : null}
    </section>
  );
}
