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
  activa: boolean;
}

/** Alta y edición de una cancha. Con `cancha` edita; sin ella, publica. */
export function FormularioCancha({
  deportes,
  cancha,
}: {
  deportes: Deporte[];
  cancha?: CanchaExistente;
}) {
  const router = useRouter();
  const [deporteId, setDeporteId] = useState(cancha?.deporteId ?? deportes[0]?.id ?? '');
  const [fotos, setFotos] = useState<{ valor: string; url: string }[]>(
    (cancha?.fotos ?? []).map((url) => ({ valor: url, url }))
  );
  const [activa, setActiva] = useState(cancha?.activa ?? true);
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
          defaultValue={cancha?.direccion ?? ''}
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
            defaultValue={cancha?.telefono ?? ''}
          />
          <ErrorDeCampo mensajes={errores.telefono} />
        </div>
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
