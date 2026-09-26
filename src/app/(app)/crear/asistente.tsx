'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

interface Deporte {
  id: string;
  nombre: string;
}

const TOTAL_PASOS = 6;
const HORAS = ['18:00', '19:00', '20:00', '21:00', '22:00', '23:00'];
const DIAS_CORTOS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const DIAS_LARGOS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

/** Los próximos 7 días como opciones rápidas. */
function proximosDias() {
  const hoy = new Date();
  return Array.from({ length: 7 }, (_, indice) => {
    const fecha = new Date(hoy);
    fecha.setDate(hoy.getDate() + indice);
    const rotulo =
      indice === 0 ? 'Hoy' : indice === 1 ? 'Mañana' : DIAS_LARGOS[fecha.getDay()];
    return {
      valor: `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`,
      rotulo,
      detalle: `${DIAS_CORTOS[fecha.getDay()]} ${fecha.getDate()}`,
    };
  });
}

/**
 * Asistente de creación en 6 pasos, un paso por pantalla (ESQUEMA.md §3.5):
 * deporte → cuándo → dónde → cupo → costo → visibilidad.
 */
export function Asistente({
  deportes,
  grupos,
  grupoInicial,
}: {
  deportes: Deporte[];
  grupos: { id: string; nombre: string; deporteId: string }[];
  grupoInicial: string | null;
}) {
  const router = useRouter();
  const dias = useMemo(proximosDias, []);

  const [paso, setPaso] = useState(1);
  const [grupoId, setGrupoId] = useState<string | null>(grupoInicial);
  const [deporteId, setDeporteId] = useState<string | null>(
    grupos.find((g) => g.id === grupoInicial)?.deporteId ?? null
  );
  const [dia, setDia] = useState<string | null>(null);
  const [hora, setHora] = useState('21:00');
  const [repite, setRepite] = useState(false);
  const [lugarNombre, setLugarNombre] = useState('');
  const [direccion, setDireccion] = useState('');
  const [cupo, setCupo] = useState(10);
  const [minimo, setMinimo] = useState(8);
  const [costo, setCosto] = useState('');
  const [visibilidad, setVisibilidad] = useState<'GRUPO' | 'ABIERTO'>('ABIERTO');
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const puedeSeguir =
    paso === 1 ? deporteId !== null
    : paso === 2 ? dia !== null && /^\d{2}:\d{2}$/.test(hora)
    : paso === 3 ? lugarNombre.trim().length >= 2
    : paso === 4 ? cupo >= 2 && minimo >= 2 && minimo <= cupo
    : true;

  async function crear() {
    setEnviando(true);
    setError(null);

    const [horas, minutos] = hora.split(':').map(Number);
    const fecha = new Date(`${dia}T00:00:00`);
    fecha.setHours(horas, minutos, 0, 0);

    const respuesta = await fetch('/api/partidos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deporteId,
        grupoId,
        fecha: fecha.toISOString(),
        recurrenteSemanal: repite,
        lugarNombre: lugarNombre.trim(),
        direccion: direccion.trim() || null,
        cupo,
        minimo,
        costoPorJugador: costo.trim() ? Number(costo) : null,
        visibilidad,
      }),
    });

    const datos = await respuesta.json().catch(() => ({}));
    if (!respuesta.ok) {
      setError(datos.error ?? 'No pudimos crear el partido. Probá de nuevo.');
      setEnviando(false);
      return;
    }
    router.push(`/partidos/${datos.id}`);
    router.refresh();
  }

  return (
    <div className="flex min-h-[70dvh] flex-col gap-5">
      <header className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="t-pantalla" style={{ fontSize: 17 }}>Nuevo partido</span>
          <span className="t-rotulo tabular">Paso {paso} de {TOTAL_PASOS}</span>
        </div>
        <div className="flex gap-1">
          {Array.from({ length: TOTAL_PASOS }, (_, indice) => (
            <i
              key={indice}
              className="h-[3px] flex-1 rounded-[2px]"
              style={{ background: indice < paso ? 'var(--verde)' : 'var(--borde)' }}
            />
          ))}
        </div>
      </header>

      {paso === 1 ? (
        <section className="flex flex-col gap-4">
          <h1 className="t-display text-[32px]">¿Qué<br />juegan?</h1>
          <div className="flex flex-wrap gap-2">
            {deportes.map((deporte) => (
              <button
                key={deporte.id}
                type="button"
                onClick={() => setDeporteId(deporte.id)}
                className={deporteId === deporte.id ? 'chip-sel chip-sel-activo' : 'chip-sel'}
              >
                {deporte.nombre}
              </button>
            ))}
          </div>
        </section>
      ) : paso === 2 ? (
        <section className="flex flex-col gap-4">
          <h1 className="t-display text-[32px]">¿Cuándo<br />juegan?</h1>
          <div>
            <span className="rotulo-campo">Día</span>
            <div className="flex flex-wrap gap-2">
              {dias.map((opcion) => (
                <button
                  key={opcion.valor}
                  type="button"
                  onClick={() => setDia(opcion.valor)}
                  className={dia === opcion.valor ? 'chip-sel chip-sel-activo' : 'chip-sel'}
                >
                  {opcion.rotulo} · {opcion.detalle}
                </button>
              ))}
            </div>
          </div>
          <div>
            <span className="rotulo-campo">Hora</span>
            <div className="flex flex-wrap gap-2">
              {HORAS.map((opcion) => (
                <button
                  key={opcion}
                  type="button"
                  onClick={() => setHora(opcion)}
                  className={hora === opcion ? 'chip-sel chip-sel-activo tabular' : 'chip-sel tabular'}
                >
                  {opcion}
                </button>
              ))}
            </div>
            <input
              id="hora-exacta"
              type="time"
              className="campo mt-2 max-w-[140px] tabular"
              value={hora}
              onChange={(evento) => setHora(evento.target.value)}
              aria-label="Hora exacta"
            />
          </div>
          <div className="tarjeta flex items-center justify-between gap-3 p-4">
            <div>
              <p className="text-sm font-semibold">Se repite todas las semanas</p>
              <p className="text-xs text-tinta-3">Las confirmaciones se reinician en cada edición.</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={repite}
              onClick={() => setRepite(!repite)}
              className="relative h-[22px] w-10 rounded-[6px] border-0"
              style={{ background: repite ? 'var(--verde)' : 'var(--borde-2)' }}
            >
              <span
                className="absolute top-[2px] h-[18px] w-[18px] rounded-[4px] transition-all"
                style={{ left: repite ? 20 : 2, background: repite ? 'var(--sobre-verde)' : 'var(--tinta-2)' }}
              />
            </button>
          </div>
        </section>
      ) : paso === 3 ? (
        <section className="flex flex-col gap-4">
          <h1 className="t-display text-[32px]">¿Dónde<br />juegan?</h1>
          <div>
            <label className="rotulo-campo" htmlFor="lugar">Cancha o lugar</label>
            <input
              id="lugar"
              className="campo"
              placeholder="Cancha El Potrero, Palermo"
              value={lugarNombre}
              onChange={(evento) => setLugarNombre(evento.target.value)}
            />
          </div>
          <div>
            <label className="rotulo-campo" htmlFor="direccion">Dirección · opcional</label>
            <input
              id="direccion"
              className="campo"
              placeholder="Av. del Libertador 4200"
              value={direccion}
              onChange={(evento) => setDireccion(evento.target.value)}
            />
          </div>
        </section>
      ) : paso === 4 ? (
        <section className="flex flex-col gap-4">
          <h1 className="t-display text-[32px]">¿Cuántos<br />son?</h1>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="rotulo-campo" htmlFor="cupo">Cupo</label>
              <input
                id="cupo"
                type="number"
                min={2}
                max={200}
                className="campo tabular"
                value={cupo}
                onChange={(evento) => setCupo(Number(evento.target.value))}
              />
            </div>
            <div>
              <label className="rotulo-campo" htmlFor="minimo">Mínimo para jugar</label>
              <input
                id="minimo"
                type="number"
                min={2}
                max={200}
                className="campo tabular"
                value={minimo}
                onChange={(evento) => setMinimo(Number(evento.target.value))}
              />
            </div>
          </div>
          <p className="text-sm text-tinta-3">
            Lleno el cupo, los siguientes entran a la lista de espera. Si alguien se baja, sube el
            primero de la lista.
          </p>
        </section>
      ) : paso === 5 ? (
        <section className="flex flex-col gap-4">
          <h1 className="t-display text-[32px]">¿Cuánto<br />sale?</h1>
          <div>
            <label className="rotulo-campo" htmlFor="costo">Costo por jugador · opcional</label>
            <input
              id="costo"
              type="number"
              min={0}
              step={100}
              className="campo tabular"
              placeholder="2500"
              value={costo}
              onChange={(evento) => setCosto(evento.target.value)}
            />
          </div>
          <p className="text-sm text-tinta-3">
            birteam no cobra nada: la plata se arregla entre ustedes. El organizador marca quién
            pagó.
          </p>
        </section>
      ) : (
        <section className="flex flex-col gap-4">
          <h1 className="t-display text-[32px]">¿Quién puede<br />verlo?</h1>
          {grupos.length > 0 ? (
            <div>
              <label className="rotulo-campo" htmlFor="sel-grupo">¿Es de un grupo?</label>
              <select
                id="sel-grupo"
                className="campo"
                value={grupoId ?? ''}
                onChange={(evento) => setGrupoId(evento.target.value || null)}
              >
                <option value="">No, partido suelto</option>
                {grupos.map((grupo) => (
                  <option key={grupo.id} value={grupo.id}>{grupo.nombre}</option>
                ))}
              </select>
              <p className="mt-1 text-xs text-tinta-3">
                Si es del grupo, todos los miembros reciben la invitación al crearlo.
              </p>
            </div>
          ) : null}
          <button
            type="button"
            onClick={() => setVisibilidad('ABIERTO')}
            className="tarjeta p-4 text-left"
            style={visibilidad === 'ABIERTO' ? { borderColor: 'var(--verde)' } : undefined}
          >
            <span className="t-rotulo text-verde-txt">Abierto</span>
            <span className="mt-1 block text-sm text-tinta-2">
              Aparece en Explorar para jugadores cercanos. Ideal si faltan jugadores.
            </span>
          </button>
          <button
            type="button"
            onClick={() => setVisibilidad('GRUPO')}
            className="tarjeta p-4 text-left"
            style={visibilidad === 'GRUPO' ? { borderColor: 'var(--verde)' } : undefined}
          >
            <span className="t-rotulo text-azul-txt">Privado</span>
            <span className="mt-1 block text-sm text-tinta-2">
              Solo lo ven los que invitás con el link.
            </span>
          </button>
        </section>
      )}

      {error ? <p className="aviso-error">{error}</p> : null}

      <div className="mt-auto flex gap-3 pt-4">
        {paso > 1 ? (
          <button type="button" className="btn btn-fantasma flex-1" onClick={() => setPaso(paso - 1)}>
            Atrás
          </button>
        ) : null}
        {paso < TOTAL_PASOS ? (
          <button
            type="button"
            className="btn btn-primario flex-[2]"
            disabled={!puedeSeguir}
            onClick={() => setPaso(paso + 1)}
          >
            Continuar
          </button>
        ) : (
          <button type="button" className="btn btn-primario flex-[2]" disabled={enviando} onClick={crear}>
            {enviando ? 'Creando…' : 'Crear el partido'}
          </button>
        )}
      </div>
    </div>
  );
}
