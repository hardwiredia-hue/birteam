'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { PasoDonde, type CanchaElegible } from '@/components/elegir-cancha';

export function FormularioEditarPartido({
  partidoId,
  confirmados,
  inicial,
  deporte,
  canchaInicial,
  esDueno,
  ciudad,
  provincia,
}: {
  partidoId: string;
  confirmados: number;
  deporte: { id: string; nombre: string };
  canchaInicial: CanchaElegible | null;
  esDueno: boolean;
  ciudad: string | null;
  provincia: string | null;
  inicial: {
    fecha: string;
    lugarNombre: string;
    direccion: string | null;
    lugarTelefono: string | null;
    cupo: number;
    minimo: number;
    costoPorJugador: number | null;
    visibilidad: string;
    recurrenteSemanal: boolean;
  };
}) {
  const router = useRouter();
  const [errores, setErrores] = useState<Record<string, string[]>>({});
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [cancha, setCancha] = useState<CanchaElegible | null>(canchaInicial);
  const [lugarNombre, setLugarNombre] = useState(inicial.lugarNombre);
  const [direccion, setDireccion] = useState(inicial.direccion ?? '');
  const [telefono, setTelefono] = useState(inicial.lugarTelefono ?? '');

  async function alEnviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setEnviando(true);
    setError(null);
    setErrores({});

    const form = new FormData(evento.currentTarget);
    // El datetime-local viene en hora argentina.
    const fechaLocal = String(form.get('fecha') ?? '');
    const fecha = new Date(`${fechaLocal}:00-03:00`);

    const respuesta = await fetch(`/api/partidos/${partidoId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fecha: fecha.toISOString(),
        lugarNombre: lugarNombre.trim(),
        direccion: direccion.trim() || null,
        lugarTelefono: telefono.trim() || null,
        canchaId: cancha?.id ?? null,
        cupo: Number(form.get('cupo')),
        minimo: Number(form.get('minimo')),
        costoPorJugador: String(form.get('costoPorJugador') ?? '').trim()
          ? Number(form.get('costoPorJugador'))
          : null,
        visibilidad: form.get('visibilidad'),
        recurrenteSemanal: form.get('recurrenteSemanal') === 'on',
      }),
    });
    const datos = await respuesta.json().catch(() => ({}));
    setEnviando(false);
    if (!respuesta.ok) {
      setError(datos.error ?? 'No pudimos guardar los cambios.');
      if (datos.detalles) setErrores(datos.detalles);
      return;
    }
    router.push(`/partidos/${partidoId}`);
    router.refresh();
  }

  return (
    <form onSubmit={alEnviar} className="flex flex-col gap-4">
      <div>
        <label className="rotulo-campo" htmlFor="fecha">Día y hora</label>
        <input id="fecha" name="fecha" type="datetime-local" className="campo tabular" defaultValue={inicial.fecha} required />
        {errores.fecha ? <p className="mt-1 text-xs text-rojo">{errores.fecha[0]}</p> : null}
      </div>

      <div>
        <span className="rotulo-campo">Dónde</span>
        <PasoDonde
          conTitulo={false}
          deporteId={deporte.id}
          deporteNombre={deporte.nombre}
          esDueno={esDueno}
          ciudad={ciudad}
          provincia={provincia}
          lugarNombre={lugarNombre}
          direccion={direccion}
          telefono={telefono}
          canchaElegida={cancha}
          alEscribir={(texto) => {
            setCancha(null);
            setLugarNombre(texto);
            if (!texto) {
              setDireccion('');
              setTelefono('');
            }
          }}
          alElegirCancha={(elegida) => {
            setCancha(elegida);
            setLugarNombre(elegida.nombre);
            setDireccion(elegida.direccion ?? '');
            setTelefono(elegida.telefono ?? '');
          }}
          alElegirLugar={(lugar) => {
            setLugarNombre(lugar.nombre);
            setDireccion(lugar.direccion ?? '');
            setTelefono(lugar.telefono ?? '');
          }}
          setDireccion={setDireccion}
          setTelefono={setTelefono}
        />
        {errores.lugarNombre ? <p className="mt-1 text-xs text-rojo">{errores.lugarNombre[0]}</p> : null}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="rotulo-campo" htmlFor="cupo">Cupo</label>
          <input id="cupo" name="cupo" type="number" min={Math.max(2, confirmados)} max={200} className="campo tabular" defaultValue={inicial.cupo} />
          {errores.cupo ? <p className="mt-1 text-xs text-rojo">{errores.cupo[0]}</p> : null}
          {confirmados > 0 ? (
            <p className="mt-1 text-xs text-tinta-3">
              Ya hay {confirmados} {confirmados === 1 ? 'confirmado' : 'confirmados'}.
            </p>
          ) : null}
        </div>
        <div>
          <label className="rotulo-campo" htmlFor="minimo">Mínimo</label>
          <input id="minimo" name="minimo" type="number" min={2} max={200} className="campo tabular" defaultValue={inicial.minimo} />
          {errores.minimo ? <p className="mt-1 text-xs text-rojo">{errores.minimo[0]}</p> : null}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="rotulo-campo" htmlFor="costoPorJugador">Costo por jugador</label>
          <input
            id="costoPorJugador"
            name="costoPorJugador"
            type="number"
            min={0}
            step={100}
            className="campo tabular"
            defaultValue={inicial.costoPorJugador ?? ''}
            placeholder="Gratis"
          />
        </div>
        <div>
          <label className="rotulo-campo" htmlFor="visibilidad">Quién lo ve</label>
          <select id="visibilidad" name="visibilidad" className="campo" defaultValue={inicial.visibilidad}>
            <option value="ABIERTO">Abierto a cercanos</option>
            <option value="GRUPO">Privado (solo con link)</option>
          </select>
        </div>
      </div>

      <label className="flex items-start gap-2.5 text-sm">
        <input type="checkbox" name="recurrenteSemanal" className="mt-1" defaultChecked={inicial.recurrenteSemanal}  />
        <span>
          Se repite todas las semanas
          <span className="block text-xs text-tinta-3">Destildalo para cortar la serie: no se arma el de la semana siguiente.</span>
        </span>
      </label>

      {error ? <p className="aviso-error">{error}</p> : null}

      <div className="grid grid-cols-2 gap-2">
        <a href={`/partidos/${partidoId}`} className="btn btn-fantasma">Cancelar</a>
        <button type="submit" className="btn btn-primario" disabled={enviando}>
          {enviando ? 'Guardando…' : 'Guardar cambios'}
        </button>
      </div>
    </form>
  );
}
