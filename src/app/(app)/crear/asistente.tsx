'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface Deporte {
  id: string;
  nombre: string;
}

const TOTAL_PASOS = 6;
const HORAS = ['18:00', '19:00', '20:00', '21:00', '22:00', '23:00'];
const DIAS_LARGOS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

function claveDeFecha(fecha: Date) {
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(
    fecha.getDate()
  ).padStart(2, '0')}`;
}

/**
 * Almanaque para elegir el día: cualquier fecha futura, los pasados bloqueados.
 * Con `diasPermitidos` (la gestión de la cancha), los demás días quedan apagados.
 */
function Almanaque({
  valor,
  alElegir,
  diasPermitidos = null,
}: {
  valor: string | null;
  alElegir: (valor: string) => void;
  diasPermitidos?: number[] | null;
}) {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const [vista, setVista] = useState(() => new Date(hoy.getFullYear(), hoy.getMonth(), 1));

  const esMesActual =
    vista.getFullYear() === hoy.getFullYear() && vista.getMonth() === hoy.getMonth();
  // Hasta un año para adelante alcanza y sobra para organizar un partido.
  const puedeAvanzar = vista < new Date(hoy.getFullYear(), hoy.getMonth() + 11, 1);
  const diasEnMes = new Date(vista.getFullYear(), vista.getMonth() + 1, 0).getDate();
  // La semana arranca el lunes, como los calendarios de acá.
  const corrimiento = (new Date(vista.getFullYear(), vista.getMonth(), 1).getDay() + 6) % 7;
  const hoyClave = claveDeFecha(hoy);

  function moverMes(saltos: number) {
    setVista(new Date(vista.getFullYear(), vista.getMonth() + saltos, 1));
  }

  return (
    <div className="tarjeta p-3">
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          onClick={() => moverMes(-1)}
          disabled={esMesActual}
          aria-label="Mes anterior"
          className="chip-sel px-3 disabled:opacity-35"
        >
          ‹
        </button>
        <span className="text-sm font-bold capitalize">
          {MESES[vista.getMonth()]} {vista.getFullYear()}
        </span>
        <button
          type="button"
          onClick={() => moverMes(1)}
          disabled={!puedeAvanzar}
          aria-label="Mes siguiente"
          className="chip-sel px-3 disabled:opacity-35"
        >
          ›
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((letra, indice) => (
          <span key={indice} className="t-rotulo py-1 text-[10px]">
            {letra}
          </span>
        ))}
        {Array.from({ length: corrimiento }, (_, indice) => (
          <span key={`vacio-${indice}`} />
        ))}
        {Array.from({ length: diasEnMes }, (_, indice) => {
          const fecha = new Date(vista.getFullYear(), vista.getMonth(), indice + 1);
          const clave = claveDeFecha(fecha);
          const cerrado = diasPermitidos !== null && !diasPermitidos.includes(fecha.getDay());
          const pasado = fecha < hoy || cerrado;
          const elegido = valor === clave;
          const esHoy = clave === hoyClave;
          return (
            <button
              key={clave}
              type="button"
              disabled={pasado}
              onClick={() => alElegir(clave)}
              className="aspect-square rounded-[6px] border text-sm font-semibold tabular"
              style={
                elegido
                  ? { background: 'var(--verde)', borderColor: 'var(--verde)', color: 'var(--sobre-verde)' }
                  : pasado
                    ? { borderColor: 'transparent', color: 'var(--tinta-3)', opacity: 0.35 }
                    : esHoy
                      ? { borderColor: 'var(--verde-txt)', color: 'var(--verde-txt)' }
                      : { borderColor: 'var(--borde)', color: 'var(--tinta)' }
              }
            >
              {indice + 1}
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface CanchaElegible {
  id: string;
  nombre: string;
  direccion: string | null;
  telefono: string | null;
  ciudad: string | null;
  deporte: string;
  deporteId: string;
  diasDisponibles: number[];
}

interface TurnoInicial {
  reservaId: string;
  canchaId: string;
  dia: string;
  hora: string;
  deporteId: string;
}

/**
 * Asistente de creación en 6 pasos, un paso por pantalla (ESQUEMA.md §3.5):
 * deporte → dónde → cuándo (respeta los días de la cancha) → cupo → costo → visibilidad.
 */
export function Asistente({
  deportes,
  grupos,
  lugares,
  canchas,
  seguidores,
  grupoInicial,
  deporteInicial,
  turnoInicial,
}: {
  deportes: Deporte[];
  grupos: { id: string; nombre: string; deporteId: string }[];
  lugares: { id: string; nombre: string; direccion: string | null; telefono: string | null }[];
  canchas: CanchaElegible[];
  seguidores: { id: string; nombre: string; usuario: string }[];
  grupoInicial: string | null;
  deporteInicial?: string | null;
  turnoInicial?: TurnoInicial | null;
}) {
  const router = useRouter();

  const [paso, setPaso] = useState(1);
  const [listaGrupos, setListaGrupos] = useState(grupos);
  const [grupoId, setGrupoId] = useState<string | null>(grupoInicial);
  // Partido sobre un turno confirmado: cancha, día y hora vienen puestos.
  const canchaDelTurno = turnoInicial
    ? (canchas.find((cancha) => cancha.id === turnoInicial.canchaId) ?? null)
    : null;
  const [deporteId, setDeporteId] = useState<string | null>(
    turnoInicial?.deporteId ??
      grupos.find((g) => g.id === grupoInicial)?.deporteId ??
      deporteInicial ??
      null
  );
  const [dia, setDia] = useState<string | null>(turnoInicial?.dia ?? null);
  const [hora, setHora] = useState(turnoInicial?.hora ?? '21:00');
  const [repite, setRepite] = useState(false);
  const [lugarNombre, setLugarNombre] = useState(canchaDelTurno?.nombre ?? '');
  const [direccion, setDireccion] = useState(canchaDelTurno?.direccion ?? '');
  const [lugarTelefono, setLugarTelefono] = useState(canchaDelTurno?.telefono ?? '');
  // Cancha publicada elegida como sede: su gestión define qué días se puede jugar.
  const [canchaElegida, setCanchaElegida] = useState<CanchaElegible | null>(canchaDelTurno);
  const [invitados, setInvitados] = useState<{ id: string; nombre: string }[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [resultados, setResultados] = useState<{ id: string; nombre: string; usuario: string }[]>([]);
  const [grupoNuevoAbierto, setGrupoNuevoAbierto] = useState(false);
  const [grupoNuevoNombre, setGrupoNuevoNombre] = useState('');
  const [creandoGrupo, setCreandoGrupo] = useState(false);
  const [cupo, setCupo] = useState(10);
  const [minimo, setMinimo] = useState(8);
  const [costo, setCosto] = useState('');
  const [visibilidad, setVisibilidad] = useState<'GRUPO' | 'ABIERTO'>('ABIERTO');
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const puedeSeguir =
    paso === 1 ? deporteId !== null
    : paso === 2 ? lugarNombre.trim().length >= 2
    : paso === 3 ? dia !== null && /^\d{2}:\d{2}$/.test(hora)
    : paso === 4 ? cupo >= 2 && minimo >= 2 && minimo <= cupo
    : true;

  function elegirCancha(cancha: CanchaElegible) {
    setCanchaElegida(cancha);
    setLugarNombre(cancha.nombre);
    setDireccion(cancha.direccion ?? '');
    setLugarTelefono(cancha.telefono ?? '');
    // Si ya había un día elegido que la cancha no abre, se vuelve a elegir.
    if (dia) {
      const fecha = new Date(`${dia}T00:00:00`);
      if (!cancha.diasDisponibles.includes(fecha.getDay())) setDia(null);
    }
  }

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
        lugarTelefono: lugarTelefono.trim() || null,
        canchaId: canchaElegida?.id ?? null,
        reservaId:
          turnoInicial && canchaElegida?.id === turnoInicial.canchaId ? turnoInicial.reservaId : null,
        invitadoIds: invitados.map((i) => i.id),
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

  function alternarInvitado(persona: { id: string; nombre: string }) {
    setInvitados((actuales) =>
      actuales.some((i) => i.id === persona.id)
        ? actuales.filter((i) => i.id !== persona.id)
        : [...actuales, persona]
    );
  }

  async function buscarPersonas(texto: string) {
    setBusqueda(texto);
    if (texto.trim().length < 2) {
      setResultados([]);
      return;
    }
    try {
      const respuesta = await fetch(`/api/jugadores?q=${encodeURIComponent(texto.trim())}`);
      const datos = await respuesta.json();
      setResultados(datos.jugadores ?? []);
    } catch {
      setResultados([]);
    }
  }

  async function crearGrupoNuevo() {
    const nombre = grupoNuevoNombre.trim();
    if (nombre.length < 2 || !deporteId) return;
    setCreandoGrupo(true);
    setError(null);
    const respuesta = await fetch('/api/grupos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre, deporteId }),
    });
    const datos = await respuesta.json().catch(() => ({}));
    setCreandoGrupo(false);
    if (!respuesta.ok) {
      setError(datos.error ?? 'No pudimos crear el grupo.');
      return;
    }
    setListaGrupos([...listaGrupos, { id: datos.id, nombre, deporteId }]);
    setGrupoId(datos.id);
    setGrupoNuevoAbierto(false);
    setGrupoNuevoNombre('');
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
        {turnoInicial && canchaElegida?.id === turnoInicial.canchaId ? (
          <p className="aviso-ok">
            Partido para tu turno en {canchaElegida.nombre}: la cancha, el día y la hora ya están
            puestos. Revisá y seguí.
          </p>
        ) : null}
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
      ) : paso === 3 ? (
        <section className="flex flex-col gap-4">
          <h1 className="t-display text-[32px]">¿Cuándo<br />juegan?</h1>
          {canchaElegida && canchaElegida.diasDisponibles.length < 7 ? (
            <p className="text-xs text-naranja-txt">
              {canchaElegida.nombre} abre:{' '}
              {[1, 2, 3, 4, 5, 6, 0]
                .filter((d) => canchaElegida.diasDisponibles.includes(d))
                .map((d) => DIAS_LARGOS[d])
                .join(', ')}
              . El almanaque solo deja elegir esos días.
            </p>
          ) : null}
          <div>
            <span className="rotulo-campo">Día</span>
            <Almanaque
              valor={dia}
              alElegir={setDia}
              diasPermitidos={canchaElegida?.diasDisponibles ?? null}
            />
            {dia ? (
              <p className="mt-2 text-sm font-semibold text-verde-txt">
                {(() => {
                  const fecha = new Date(`${dia}T00:00:00`);
                  return `${DIAS_LARGOS[fecha.getDay()]} ${fecha.getDate()} de ${MESES[fecha.getMonth()]}`;
                })()}
              </p>
            ) : (
              <p className="mt-2 text-xs text-tinta-3">Tocá el día en el almanaque.</p>
            )}
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
      ) : paso === 2 ? (
        <section className="flex flex-col gap-4">
          <h1 className="t-display text-[32px]">¿Dónde<br />juegan?</h1>
          {canchas.length > 0 ? (
            <div>
              <span className="rotulo-campo">Canchas publicadas en birteam</span>
              <div className="flex flex-col gap-2">
                {canchas.map((cancha) => {
                  const elegida = canchaElegida?.id === cancha.id;
                  return (
                    <button
                      key={cancha.id}
                      type="button"
                      onClick={() => elegirCancha(cancha)}
                      className="tarjeta p-3.5 text-left"
                      style={elegida ? { borderColor: 'var(--naranja-txt)' } : undefined}
                    >
                      <span className="t-rotulo text-naranja-txt">{cancha.deporte}</span>
                      <span className="mt-0.5 block text-sm font-semibold">{cancha.nombre}</span>
                      <span className="mt-0.5 block text-xs text-tinta-3">
                        {cancha.direccion ?? ''}
                        {cancha.direccion && cancha.ciudad ? ' · ' : ''}
                        {cancha.ciudad ?? ''}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}
          {lugares.length > 0 ? (
            <div>
              <span className="rotulo-campo">Tus lugares · un toque y listo</span>
              <div className="flex flex-col gap-2">
                {lugares.map((lugar) => {
                  const elegido = lugarNombre === lugar.nombre;
                  return (
                    <button
                      key={lugar.id}
                      type="button"
                      onClick={() => {
                        setCanchaElegida(null);
                        setLugarNombre(lugar.nombre);
                        setDireccion(lugar.direccion ?? '');
                        setLugarTelefono(lugar.telefono ?? '');
                      }}
                      className="tarjeta p-3.5 text-left"
                      style={elegido ? { borderColor: 'var(--verde)' } : undefined}
                    >
                      <span className="block text-sm font-semibold">{lugar.nombre}</span>
                      {lugar.direccion || lugar.telefono ? (
                        <span className="mt-0.5 block text-xs text-tinta-3">
                          {lugar.direccion ?? ''}
                          {lugar.direccion && lugar.telefono ? ' · ' : ''}
                          {lugar.telefono ? `tel. ${lugar.telefono}` : ''}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 text-xs text-tinta-3">O cargá uno nuevo acá abajo: queda guardado para la próxima.</p>
            </div>
          ) : null}
          <div>
            <label className="rotulo-campo" htmlFor="lugar">Cancha o lugar</label>
            <input
              id="lugar"
              className="campo"
              placeholder="Cancha El Potrero, Palermo"
              value={lugarNombre}
              onChange={(evento) => {
                setCanchaElegida(null);
                setLugarNombre(evento.target.value);
              }}
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
          <div>
            <label className="rotulo-campo" htmlFor="lugar-telefono">Teléfono o contacto de la cancha · opcional</label>
            <input
              id="lugar-telefono"
              className="campo"
              placeholder="+54 9 11 5555-1234"
              value={lugarTelefono}
              onChange={(evento) => setLugarTelefono(evento.target.value)}
            />
            <p className="mt-1 text-xs text-tinta-3">
              Se muestra en el partido, para reservar o avisar cualquier cosa.
            </p>
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
          <div>
            <label className="rotulo-campo" htmlFor="sel-grupo">¿Es de un grupo?</label>
            <select
              id="sel-grupo"
              className="campo"
              value={grupoNuevoAbierto ? 'nuevo' : (grupoId ?? '')}
              onChange={(evento) => {
                if (evento.target.value === 'nuevo') {
                  setGrupoNuevoAbierto(true);
                  setGrupoId(null);
                } else {
                  setGrupoNuevoAbierto(false);
                  setGrupoId(evento.target.value || null);
                }
              }}
            >
              <option value="">No, partido suelto</option>
              {listaGrupos.map((grupo) => (
                <option key={grupo.id} value={grupo.id}>{grupo.nombre}</option>
              ))}
              <option value="nuevo">+ Crear un grupo nuevo</option>
            </select>
            <p className="mt-1 text-xs text-tinta-3">
              Si es del grupo, todos los miembros reciben la invitación al crearlo.
            </p>
            {grupoNuevoAbierto ? (
              <div className="mt-2 flex gap-2">
                <input
                  className="campo flex-1"
                  placeholder="Nombre del grupo (Los pibes del lunes)"
                  value={grupoNuevoNombre}
                  maxLength={60}
                  onChange={(evento) => setGrupoNuevoNombre(evento.target.value)}
                />
                <button
                  type="button"
                  className="btn btn-secundario btn-sm"
                  onClick={crearGrupoNuevo}
                  disabled={creandoGrupo || grupoNuevoNombre.trim().length < 2}
                >
                  {creandoGrupo ? '…' : 'Crear'}
                </button>
              </div>
            ) : null}
          </div>

          <div>
            <span className="rotulo-campo">Invitá gente · opcional</span>
            {seguidores.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {seguidores.map((persona) => {
                  const elegido = invitados.some((i) => i.id === persona.id);
                  return (
                    <button
                      key={persona.id}
                      type="button"
                      onClick={() => alternarInvitado(persona)}
                      className={elegido ? 'chip-sel chip-sel-activo' : 'chip-sel'}
                    >
                      {persona.nombre}
                    </button>
                  );
                })}
              </div>
            ) : null}
            <input
              id="buscar-invitados"
              className="campo mt-2"
              placeholder="Buscar a alguien por nombre o usuario…"
              value={busqueda}
              onChange={(evento) => buscarPersonas(evento.target.value)}
            />
            {resultados.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-2">
                {resultados
                  .filter((persona) => !seguidores.some((s) => s.id === persona.id))
                  .map((persona) => {
                    const elegido = invitados.some((i) => i.id === persona.id);
                    return (
                      <button
                        key={persona.id}
                        type="button"
                        onClick={() => alternarInvitado(persona)}
                        className={elegido ? 'chip-sel chip-sel-activo' : 'chip-sel'}
                      >
                        {persona.nombre} · @{persona.usuario}
                      </button>
                    );
                  })}
              </div>
            ) : null}
            {invitados.length > 0 ? (
              <p className="mt-2 text-xs font-semibold text-verde-txt">
                {invitados.length === 1
                  ? `Se invita a ${invitados[0].nombre} al crear el partido.`
                  : `Se invita a ${invitados.length} personas al crear el partido.`}
              </p>
            ) : (
              <p className="mt-1 text-xs text-tinta-3">
                Los que siguen tu perfil aparecen arriba; al resto, buscalos.
              </p>
            )}
          </div>
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
