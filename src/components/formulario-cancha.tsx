'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { SelectorCiudad } from '@/components/selector-ciudad';

interface Deporte {
  id: string;
  nombre: string;
}

interface CanchaExistente {
  id: string;
  nombre: string;
  descripcion: string | null;
  deporteId: string;
  direccion: string;
  ciudad: string | null;
  provincia: string | null;
  telefono: string | null;
  precioPorHora: number | null;
  fotos: string[];
  diasDisponibles: number[];
  horaApertura: number;
  horaCierre: number;
  duracionTurno: number;
  reservasOnline: boolean;
  cobroOnline: string;
  senaPorcentaje: number;
  activa: boolean;
}

const HORAS = Array.from({ length: 25 }, (_, hora) => hora);
const rotuloHora = (hora: number) => (hora === 24 ? '24:00 (medianoche)' : `${String(hora).padStart(2, '0')}:00`);

// Semana de lunes a domingo, con el índice que usa Date.getDay().
const DIAS_SEMANA = [
  { dia: 1, rotulo: 'Lun' },
  { dia: 2, rotulo: 'Mar' },
  { dia: 3, rotulo: 'Mié' },
  { dia: 4, rotulo: 'Jue' },
  { dia: 5, rotulo: 'Vie' },
  { dia: 6, rotulo: 'Sáb' },
  { dia: 0, rotulo: 'Dom' },
];

/** Alta y edición de una cancha. Con `cancha` edita; sin ella, publica. */
export function FormularioCancha({
  deportes,
  cancha,
  predeterminados,
  mercadoPago,
}: {
  deportes: Deporte[];
  cancha?: CanchaExistente;
  /** Dirección y teléfono del complejo (del registro), para no tipear dos veces. */
  predeterminados?: { direccion?: string | null; telefono?: string | null };
  /** Estado de Mercado Pago del dueño: habilita el cobro online. */
  mercadoPago?: { conectada: boolean; comision: number };
}) {
  const router = useRouter();
  const [deporteId, setDeporteId] = useState(cancha?.deporteId ?? deportes[0]?.id ?? '');
  const [fotos, setFotos] = useState<{ valor: string; url: string }[]>(
    (cancha?.fotos ?? []).map((url) => ({ valor: url, url }))
  );
  const [activa, setActiva] = useState(cancha?.activa ?? true);
  const [dias, setDias] = useState<number[]>(cancha?.diasDisponibles ?? [0, 1, 2, 3, 4, 5, 6]);
  const [apertura, setApertura] = useState(cancha?.horaApertura ?? 9);
  const [cierre, setCierre] = useState(cancha?.horaCierre ?? 23);
  const [duracion, setDuracion] = useState(cancha?.duracionTurno ?? 60);
  const [reservasOnline, setReservasOnline] = useState(cancha?.reservasOnline ?? true);
  const [cobroOnline, setCobroOnline] = useState(cancha?.cobroOnline ?? 'NO');
  const [senaPorcentaje, setSenaPorcentaje] = useState(cancha?.senaPorcentaje ?? 30);
  const [subiendo, setSubiendo] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [errores, setErrores] = useState<Record<string, string[]>>({});
  const [error, setError] = useState<string | null>(null);

  async function elegirFotos(evento: React.ChangeEvent<HTMLInputElement>) {
    const elegidas = Array.from(evento.target.files ?? []).slice(0, 5 - fotos.length);
    if (elegidas.length === 0) return;
    setSubiendo(true);
    setError(null);
    for (const archivo of elegidas) {
      const form = new FormData();
      form.append('archivo', archivo);
      const respuesta = await fetch('/api/archivos', { method: 'POST', body: form });
      const datos = await respuesta.json().catch(() => ({}));
      if (!respuesta.ok) {
        setError(datos.error ?? 'No pudimos subir una foto.');
        break;
      }
      setFotos((previas) => [...previas, { valor: datos.nombre, url: datos.url }]);
    }
    setSubiendo(false);
    evento.target.value = '';
  }

  async function alEnviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setEnviando(true);
    setError(null);
    setErrores({});

    const form = new FormData(evento.currentTarget);
    const numero = (crudo: FormDataEntryValue | null) => {
      const valor = String(crudo ?? '').trim();
      const parseado = Number(valor);
      return valor && Number.isFinite(parseado) ? parseado : null;
    };

    const cuerpo = {
      nombre: form.get('nombre'),
      descripcion: String(form.get('descripcion') ?? '').trim() || null,
      deporteId,
      direccion: form.get('direccion'),
      ciudad: form.get('ciudad') || null,
      provincia: form.get('provincia') || null,
      pais: form.get('pais') || 'AR',
      latitud: numero(form.get('latitud')),
      longitud: numero(form.get('longitud')),
      precioPorHora: numero(form.get('precioPorHora')),
      telefono: String(form.get('telefono') ?? '').trim() || null,
      fotos: fotos.map((foto) => foto.valor),
      diasDisponibles: dias,
      horaApertura: apertura,
      horaCierre: cierre,
      duracionTurno: duracion,
      reservasOnline,
      cobroOnline: mercadoPago?.conectada ? cobroOnline : 'NO',
      senaPorcentaje,
      ...(cancha ? { activa } : {}),
    };

    const respuesta = await fetch(cancha ? `/api/canchas/${cancha.id}` : '/api/canchas', {
      method: cancha ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cuerpo),
    });

    if (!respuesta.ok) {
      const datos = await respuesta.json().catch(() => ({}));
      setError(datos.error ?? 'No pudimos guardar la cancha. Probá de nuevo.');
      if (datos.detalles) setErrores(datos.detalles);
      setEnviando(false);
      return;
    }

    const datos = await respuesta.json().catch(() => ({}));
    router.push(`/canchas/${cancha ? cancha.id : datos.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={alEnviar} className="flex flex-col gap-4">
      <div>
        <label className="rotulo-campo" htmlFor="nombre">
          Nombre de la cancha
        </label>
        <input
          id="nombre"
          name="nombre"
          className="campo"
          placeholder="Complejo El Potrero"
          defaultValue={cancha?.nombre ?? ''}
          required
        />
        <ErrorDeCampo mensajes={errores.nombre} />
      </div>

      <div>
        <span className="rotulo-campo">Deporte</span>
        <div className="mt-1 flex flex-wrap gap-2">
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
        <ErrorDeCampo mensajes={errores.deporteId} />
      </div>

      <div>
        <label className="rotulo-campo" htmlFor="direccion">
          Dirección
        </label>
        <input
          id="direccion"
          name="direccion"
          className="campo"
          placeholder="Av. Siempreviva 742"
          defaultValue={cancha?.direccion ?? predeterminados?.direccion ?? ''}
          required
        />
        <ErrorDeCampo mensajes={errores.direccion} />
      </div>

      <div>
        <label className="rotulo-campo" htmlFor="ciudad">
          Ciudad
        </label>
        <SelectorCiudad
          inicial={cancha ? { ciudad: cancha.ciudad, provincia: cancha.provincia } : undefined}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="rotulo-campo" htmlFor="precioPorHora">
            Precio por hora
          </label>
          <input
            id="precioPorHora"
            name="precioPorHora"
            type="number"
            min={0}
            step="any"
            className="campo"
            placeholder="En pesos"
            defaultValue={cancha?.precioPorHora ?? ''}
          />
          <ErrorDeCampo mensajes={errores.precioPorHora} />
        </div>
        <div>
          <label className="rotulo-campo" htmlFor="telefono">
            Teléfono
          </label>
          <input
            id="telefono"
            name="telefono"
            className="campo"
            placeholder="Para reservas"
            defaultValue={cancha?.telefono ?? predeterminados?.telefono ?? ''}
          />
          <ErrorDeCampo mensajes={errores.telefono} />
        </div>
      </div>

      <div>
        <span className="rotulo-campo">Días disponibles · el almanaque de los partidos los respeta</span>
        <div className="mt-1 flex flex-wrap gap-2">
          {DIAS_SEMANA.map(({ dia, rotulo }) => {
            const activo = dias.includes(dia);
            return (
              <button
                key={dia}
                type="button"
                onClick={() =>
                  setDias((actuales) =>
                    actuales.includes(dia)
                      ? actuales.filter((otro) => otro !== dia)
                      : [...actuales, dia]
                  )
                }
                className={activo ? 'chip-sel chip-sel-activo' : 'chip-sel'}
              >
                {rotulo}
              </button>
            );
          })}
        </div>
        {dias.length === 0 ? (
          <p className="mt-1 text-xs text-rojo">Marcá al menos un día.</p>
        ) : null}
        <ErrorDeCampo mensajes={errores.diasDisponibles} />
      </div>

      <div className="tarjeta flex flex-col gap-3 p-4">
        <div>
          <p className="text-sm font-semibold">Turnos</p>
          <p className="text-xs text-tinta-3">
            Con esto se arma la grilla de horarios que ven los jugadores para pedir turno.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="rotulo-campo" htmlFor="horaApertura">
              Abre
            </label>
            <select
              id="horaApertura"
              className="campo"
              value={apertura}
              onChange={(evento) => setApertura(Number(evento.target.value))}
            >
              {HORAS.slice(0, 24).map((hora) => (
                <option key={hora} value={hora}>
                  {rotuloHora(hora)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="rotulo-campo" htmlFor="horaCierre">
              Cierra
            </label>
            <select
              id="horaCierre"
              className="campo"
              value={cierre}
              onChange={(evento) => setCierre(Number(evento.target.value))}
            >
              {HORAS.slice(1).map((hora) => (
                <option key={hora} value={hora}>
                  {rotuloHora(hora)}
                </option>
              ))}
            </select>
          </div>
        </div>
        <ErrorDeCampo mensajes={errores.horaCierre} />
        <div>
          <span className="rotulo-campo">Duración de cada turno</span>
          <div className="mt-1 flex flex-wrap gap-2">
            {[60, 90, 120].map((minutos) => (
              <button
                key={minutos}
                type="button"
                onClick={() => setDuracion(minutos)}
                className={duracion === minutos ? 'chip-sel chip-sel-activo' : 'chip-sel'}
              >
                {minutos === 60 ? '1 hora' : minutos === 90 ? '1 h 30' : '2 horas'}
              </button>
            ))}
          </div>
        </div>
        <label className="flex items-center justify-between gap-3">
          <span>
            <span className="block text-sm font-semibold">Recibir pedidos de turno online</span>
            <span className="block text-xs text-tinta-3">
              Cada pedido te llega como aviso y lo confirmás o rechazás vos. Apagado, se
              reserva solo por teléfono.
            </span>
          </span>
          <input
            type="checkbox"
            checked={reservasOnline}
            onChange={(evento) => setReservasOnline(evento.target.checked)}
            className="h-5 w-5 shrink-0 accent-[#a8e617]"
          />
        </label>
        {reservasOnline ? (
          <div className="flex flex-col gap-2 border-t border-borde pt-3">
            <p className="text-sm font-semibold">Cobro online con Mercado Pago</p>
            {mercadoPago?.conectada ? (
              <>
                <div className="flex flex-wrap gap-2">
                  {[
                    { valor: 'NO', rotulo: 'No, se paga allá' },
                    { valor: 'SENA', rotulo: 'Seña' },
                    { valor: 'TOTAL', rotulo: 'Turno completo' },
                  ].map((opcion) => (
                    <button
                      key={opcion.valor}
                      type="button"
                      onClick={() => setCobroOnline(opcion.valor)}
                      className={cobroOnline === opcion.valor ? 'chip-sel chip-sel-activo' : 'chip-sel'}
                    >
                      {opcion.rotulo}
                    </button>
                  ))}
                </div>
                {cobroOnline === 'SENA' ? (
                  <label className="flex items-center gap-2 text-sm">
                    Seña del
                    <input
                      type="number"
                      min={10}
                      max={90}
                      step={5}
                      value={senaPorcentaje}
                      onChange={(evento) => setSenaPorcentaje(Number(evento.target.value) || 30)}
                      className="campo w-20 tabular"
                    />
                    % del precio
                  </label>
                ) : null}
                <p className="text-xs text-tinta-3">
                  {cobroOnline === 'NO'
                    ? 'Los pedidos te llegan para confirmar y se paga en el complejo.'
                    : `El turno se confirma solo cuando el jugador paga; la plata va directo a tu Mercado Pago.${
                        mercadoPago.comision > 0 ? ` birteam retiene un ${mercadoPago.comision}% de lo cobrado online.` : ''
                      } Si cancelás vos, o el jugador con tiempo, se le devuelve automáticamente.`}
                </p>
                <ErrorDeCampo mensajes={errores.precioPorHora} />
              </>
            ) : (
              <p className="text-xs text-tinta-3">
                Conectá tu cuenta de Mercado Pago desde “Mi complejo” para cobrar seña o el turno
                completo al reservar.
              </p>
            )}
          </div>
        ) : null}
      </div>

      <div>
        <label className="rotulo-campo" htmlFor="descripcion">
          Descripción
        </label>
        <textarea
          id="descripcion"
          name="descripcion"
          className="campo min-h-24"
          placeholder="Césped sintético, vestuarios, estacionamiento, iluminación…"
          defaultValue={cancha?.descripcion ?? ''}
        />
        <ErrorDeCampo mensajes={errores.descripcion} />
      </div>

      <div>
        <span className="rotulo-campo">Fotos · hasta 5</span>
        {fotos.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-2">
            {fotos.map((foto, indice) => (
              <div key={foto.url} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={foto.url}
                  alt={`Foto ${indice + 1}`}
                  className="h-[84px] w-[84px] rounded-[6px] border border-borde object-cover"
                />
                <button
                  type="button"
                  aria-label="Quitar foto"
                  onClick={() => setFotos((previas) => previas.filter((otra) => otra !== foto))}
                  className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-[4px] bg-rojo text-[11px] font-bold text-white"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        ) : null}
        {fotos.length < 5 ? (
          <label className="btn btn-secundario btn-sm mt-2 inline-flex cursor-pointer">
            {subiendo ? 'Subiendo…' : 'Agregar fotos'}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="hidden"
              onChange={elegirFotos}
              disabled={subiendo}
            />
          </label>
        ) : null}
        <ErrorDeCampo mensajes={errores.fotos} />
      </div>

      {cancha ? (
        <label className="tarjeta flex items-center justify-between p-4">
          <span>
            <span className="block text-sm font-semibold">Publicada</span>
            <span className="block text-xs text-tinta-3">
              Pausala si está en obras o no querés recibir consultas.
            </span>
          </span>
          <input
            type="checkbox"
            checked={activa}
            onChange={(evento) => setActiva(evento.target.checked)}
            className="h-5 w-5 accent-[#a8e617]"
          />
        </label>
      ) : null}

      {error ? <p className="aviso-error">{error}</p> : null}

      <button type="submit" className="btn btn-primario mt-2" disabled={enviando || subiendo}>
        {enviando ? 'Guardando…' : cancha ? 'Guardar cambios' : 'Publicar la cancha'}
      </button>
    </form>
  );
}

function ErrorDeCampo({ mensajes }: { mensajes?: string[] }) {
  if (!mensajes?.length) return null;
  return <p className="mt-1 text-xs text-rojo">{mensajes[0]}</p>;
}
