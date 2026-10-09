'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { NIVELES, ROTULOS_NIVEL } from '@/lib/constantes';

interface MiGrupo {
  id: string;
  nombre: string;
  deporteId: string;
  ciudad: string | null;
  deporte: string;
}
interface Candidato {
  id: string;
  nombre: string;
  ciudad: string | null;
  deporteId: string;
  miembros: number;
}

/** Jugadores por lado más comunes según el deporte (se puede cambiar). */
const POR_LADO: Record<string, number> = {
  'Fútbol 5': 5,
  'Fútbol 11': 11,
  Básquet: 5,
  Vóley: 6,
  Rugby: 15,
  Hockey: 11,
  Handball: 7,
  Pádel: 2,
  Tenis: 1,
};

export function FormularioDesafio({
  misGrupos,
  candidatos,
  canchas,
  grupoInicial,
  rivalInicial,
}: {
  misGrupos: MiGrupo[];
  candidatos: Candidato[];
  canchas: { id: string; nombre: string; direccion: string; deporteId: string }[];
  grupoInicial: string | null;
  rivalInicial: string | null;
}) {
  const router = useRouter();
  const inicialRival = candidatos.find((c) => c.id === rivalInicial);
  const [retadorId, setRetadorId] = useState(
    grupoInicial ??
      misGrupos.find((g) => g.deporteId === inicialRival?.deporteId)?.id ??
      misGrupos[0].id
  );
  const retador = misGrupos.find((g) => g.id === retadorId)!;
  const [rivalId, setRivalId] = useState<string | null>(rivalInicial);
  const [busqueda, setBusqueda] = useState('');
  const [dia, setDia] = useState('');
  const [hora, setHora] = useState('21:00');
  const [lugarNombre, setLugarNombre] = useState('');
  const [direccion, setDireccion] = useState('');
  const [canchaId, setCanchaId] = useState<string | null>(null);
  const [porLado, setPorLado] = useState(POR_LADO[retador.deporte] ?? 5);
  const [nivel, setNivel] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errores, setErrores] = useState<Record<string, string[]>>({});

  // Rivales posibles: mismo deporte; los de tu ciudad primero.
  const posibles = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    return candidatos
      .filter((c) => c.deporteId === retador.deporteId)
      .filter((c) => !texto || c.nombre.toLowerCase().includes(texto) || (c.ciudad ?? '').toLowerCase().includes(texto))
      .sort((a, b) => Number(b.ciudad === retador.ciudad) - Number(a.ciudad === retador.ciudad))
      .slice(0, 8);
  }, [candidatos, busqueda, retador]);
  const rival = candidatos.find((c) => c.id === rivalId) ?? null;
  const canchasDelDeporte = canchas.filter((c) => c.deporteId === retador.deporteId);
  const hoy = new Date().toLocaleDateString('en-CA');

  function cambiarGrupo(id: string) {
    setRetadorId(id);
    const grupo = misGrupos.find((g) => g.id === id)!;
    setPorLado(POR_LADO[grupo.deporte] ?? 5);
    if (rival && rival.deporteId !== grupo.deporteId) setRivalId(null);
    setCanchaId(null);
  }

  async function enviar() {
    if (!dia) {
      setError('Elegí el día.');
      return;
    }
    setEnviando(true);
    setError(null);
    setErrores({});
    const fecha = new Date(`${dia}T${hora}:00`);
    const respuesta = await fetch('/api/desafios', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        retadorId,
        rivalId,
        fecha: fecha.toISOString(),
        lugarNombre: lugarNombre.trim(),
        direccion: direccion.trim() || null,
        canchaId,
        jugadoresPorLado: porLado,
        nivel,
        mensaje: mensaje.trim() || null,
      }),
    });
    const datos = await respuesta.json().catch(() => ({}));
    setEnviando(false);
    if (!respuesta.ok) {
      setError(datos.error ?? 'No pudimos mandar el desafío.');
      if (datos.detalles) setErrores(datos.detalles);
      return;
    }
    router.push('/desafios');
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      {misGrupos.length > 1 ? (
        <div>
          <label className="rotulo-campo" htmlFor="retador">Tu grupo</label>
          <select id="retador" className="campo" value={retadorId} onChange={(e) => cambiarGrupo(e.target.value)}>
            {misGrupos.map((g) => (
              <option key={g.id} value={g.id}>
                {g.nombre} · {g.deporte}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <p className="text-sm">
          <span className="t-rotulo">Tu grupo</span>{' '}
          <span className="font-semibold">{retador.nombre}</span>{' '}
          <span className="text-tinta-3">· {retador.deporte}</span>
        </p>
      )}

      <div>
        <span className="rotulo-campo">Rival</span>
        <div className="mt-1 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => setRivalId(null)}
            className={rivalId === null ? 'chip-sel chip-sel-activo self-start' : 'chip-sel self-start'}
          >
            Abierto: que lo acepte cualquier grupo
          </button>
          {rival ? (
            <div className="tarjeta flex items-center justify-between p-3" style={{ borderColor: 'var(--verde-txt)' }}>
              <span className="text-sm font-semibold">
                {rival.nombre}
                <span className="font-normal text-tinta-3">
                  {' '}· {rival.miembros} miembros{rival.ciudad ? ` · ${rival.ciudad}` : ''}
                </span>
              </span>
              <button type="button" className="text-xs font-semibold text-tinta-3" onClick={() => setRivalId(null)}>
                Quitar
              </button>
            </div>
          ) : null}
          <input
            className="campo"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder={`Buscar un grupo de ${retador.deporte} por nombre o ciudad`}
          />
          {posibles.length > 0 ? (
            <div className="flex flex-col">
              {posibles.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setRivalId(c.id)}
                  className="flex items-center justify-between border-b border-borde py-2 text-left text-sm last:border-b-0"
                >
                  <span className="font-semibold">{c.nombre}</span>
                  <span className="text-xs text-tinta-3">
                    {c.miembros} miembros{c.ciudad ? ` · ${c.ciudad}` : ''}
                    {c.ciudad && c.ciudad === retador.ciudad ? ' · tu ciudad' : ''}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-xs text-tinta-3">No hay otros grupos de {retador.deporte} todavía: publicalo abierto.</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="rotulo-campo" htmlFor="dia">Día</label>
          <input id="dia" type="date" min={hoy} className="campo" value={dia} onChange={(e) => setDia(e.target.value)} />
        </div>
        <div>
          <label className="rotulo-campo" htmlFor="hora">Hora</label>
          <input id="hora" type="time" step={900} className="campo" value={hora} onChange={(e) => setHora(e.target.value)} />
        </div>
      </div>
      {errores.fecha ? <p className="text-xs text-rojo">{errores.fecha[0]}</p> : null}

      <div>
        <span className="rotulo-campo">Dónde</span>
        {canchasDelDeporte.length > 0 ? (
          <div className="mt-1 flex flex-wrap gap-2">
            {canchasDelDeporte.slice(0, 6).map((cancha) => (
              <button
                key={cancha.id}
                type="button"
                onClick={() => {
                  setCanchaId(cancha.id);
                  setLugarNombre(cancha.nombre);
                  setDireccion(cancha.direccion);
                }}
                className={canchaId === cancha.id ? 'chip-sel chip-sel-activo' : 'chip-sel'}
              >
                {cancha.nombre}
              </button>
            ))}
          </div>
        ) : null}
        <input
          className="campo mt-2"
          value={lugarNombre}
          onChange={(e) => {
            setLugarNombre(e.target.value);
            setCanchaId(null);
          }}
          placeholder="Nombre de la cancha o lugar"
        />
        {errores.lugarNombre ? <p className="mt-1 text-xs text-rojo">{errores.lugarNombre[0]}</p> : null}
        <input
          className="campo mt-2"
          value={direccion}
          onChange={(e) => setDireccion(e.target.value)}
          placeholder="Dirección (opcional)"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="rotulo-campo" htmlFor="porLado">Jugadores por lado</label>
          <input
            id="porLado"
            type="number"
            min={1}
            max={15}
            className="campo tabular"
            value={porLado}
            onChange={(e) => setPorLado(Math.max(1, Math.min(15, Number(e.target.value) || 1)))}
          />
        </div>
      </div>

      <div>
        <span className="rotulo-campo">Nivel · opcional</span>
        <div className="mt-1 flex flex-wrap gap-2">
          <button type="button" onClick={() => setNivel(null)} className={nivel === null ? 'chip-sel chip-sel-activo' : 'chip-sel'}>
            Cualquiera
          </button>
          {NIVELES.map((opcion) => (
            <button
              key={opcion}
              type="button"
              onClick={() => setNivel(opcion)}
              className={nivel === opcion ? 'chip-sel chip-sel-activo' : 'chip-sel'}
            >
              {ROTULOS_NIVEL[opcion]}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="rotulo-campo" htmlFor="mensaje">Mensaje · opcional</label>
        <textarea
          id="mensaje"
          className="campo min-h-20"
          maxLength={300}
          value={mensaje}
          onChange={(e) => setMensaje(e.target.value)}
          placeholder="Pagamos la cancha a medias, tercer tiempo incluido…"
        />
      </div>

      {error ? <p className="aviso-error">{error}</p> : null}
      <button type="button" className="btn btn-primario" disabled={enviando} onClick={enviar}>
        {enviando ? 'Enviando…' : rival ? `Desafiar a ${rival.nombre}` : 'Publicar desafío abierto'}
      </button>
    </div>
  );
}
