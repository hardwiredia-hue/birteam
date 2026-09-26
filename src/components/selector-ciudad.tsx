'use client';

import { useEffect, useRef, useState } from 'react';

interface Sugerencia {
  id: string;
  ciudad: string;
  provincia: string;
  pais: string;
  latitud: number | null;
  longitud: number | null;
}

/**
 * Escribís "mar del" y se completan ciudad, provincia, país y coordenadas de
 * un saque. Si tu ciudad no aparece, lo escrito queda como ciudad a mano.
 *
 * Deja para el <form> los campos: ciudad, provincia, pais, latitud, longitud.
 */
export function SelectorCiudad({
  inicial,
}: {
  inicial?: { ciudad?: string | null; provincia?: string | null };
}) {
  const [texto, setTexto] = useState(inicial?.ciudad ?? '');
  const [sugerencias, setSugerencias] = useState<Sugerencia[]>([]);
  const [abierto, setAbierto] = useState(false);
  const [elegida, setElegida] = useState<Sugerencia | null>(null);
  const [provinciaManual] = useState(inicial?.provincia ?? '');
  // Cascada País → Provincia → Ciudad, para el que prefiere elegir a escribir.
  const [modoCascada, setModoCascada] = useState(false);
  const [provincias, setProvincias] = useState<{ id: string; nombre: string }[]>([]);
  const [provinciaId, setProvinciaId] = useState('');
  const [ciudades, setCiudades] = useState<Sugerencia[]>([]);
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);
  const caja = useRef<HTMLDivElement>(null);

  async function abrirCascada() {
    setModoCascada(true);
    if (provincias.length === 0) {
      try {
        const respuesta = await fetch('/api/ubicaciones?listar=provincias');
        const datos = await respuesta.json();
        setProvincias(datos.provincias ?? []);
      } catch {
        setProvincias([]);
      }
    }
  }

  async function elegirProvincia(id: string) {
    setProvinciaId(id);
    setCiudades([]);
    setElegida(null);
    if (!id) return;
    try {
      const respuesta = await fetch(`/api/ubicaciones?provinciaId=${encodeURIComponent(id)}`);
      const datos = await respuesta.json();
      setCiudades(datos.ciudades ?? []);
    } catch {
      setCiudades([]);
    }
  }

  useEffect(() => {
    function afuera(evento: MouseEvent) {
      if (caja.current && !caja.current.contains(evento.target as Node)) setAbierto(false);
    }
    document.addEventListener('mousedown', afuera);
    return () => document.removeEventListener('mousedown', afuera);
  }, []);

  function alEscribir(valor: string) {
    setTexto(valor);
    setElegida(null);
    if (temporizador.current) clearTimeout(temporizador.current);
    if (valor.trim().length < 2) {
      setSugerencias([]);
      setAbierto(false);
      return;
    }
    temporizador.current = setTimeout(async () => {
      try {
        const respuesta = await fetch(`/api/ubicaciones?q=${encodeURIComponent(valor)}`);
        const datos = await respuesta.json();
        setSugerencias(datos.resultados ?? []);
        setAbierto(true);
      } catch {
        setSugerencias([]);
      }
    }, 180);
  }

  function elegir(sugerencia: Sugerencia) {
    setElegida(sugerencia);
    setTexto(sugerencia.ciudad);
    setAbierto(false);
  }

  return (
    <div ref={caja} className="relative">
      <input
        id="ciudad"
        name="ciudad"
        className="campo"
        placeholder="Escribí tu ciudad…"
        value={texto}
        onChange={(evento) => alEscribir(evento.target.value)}
        onFocus={() => sugerencias.length > 0 && setAbierto(true)}
        autoComplete="off"
      />
      <input type="hidden" name="provincia" value={elegida?.provincia ?? provinciaManual} />
      <input type="hidden" name="pais" value={elegida?.pais ?? 'AR'} />
      <input type="hidden" name="latitud" value={elegida?.latitud ?? ''} />
      <input type="hidden" name="longitud" value={elegida?.longitud ?? ''} />

      {abierto && sugerencias.length > 0 ? (
        <ul
          className="absolute inset-x-0 top-full z-20 mt-1 overflow-hidden rounded-[6px] border border-borde-2 bg-panel"
          role="listbox"
        >
          {sugerencias.map((sugerencia) => (
            <li key={sugerencia.id}>
              <button
                type="button"
                role="option"
                aria-selected={elegida?.id === sugerencia.id}
                className="flex w-full items-baseline justify-between gap-3 px-3.5 py-2.5 text-left text-sm hover:bg-fondo"
                onClick={() => elegir(sugerencia)}
              >
                <span className="font-semibold">{sugerencia.ciudad}</span>
                <span className="text-xs text-tinta-3">{sugerencia.provincia}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <p className="mt-1 text-xs text-tinta-3">
        {elegida
          ? `${elegida.ciudad} · ${elegida.provincia} · Argentina ✓`
          : texto.trim().length >= 2
            ? 'Elegí de la lista, o dejá lo escrito si no aparece.'
            : 'Con tu ciudad te mostramos partidos y jugadores de tu zona.'}
      </p>

      {modoCascada ? (
        <div className="mt-3 grid grid-cols-1 gap-3">
          <div>
            <label className="rotulo-campo" htmlFor="sel-pais">País</label>
            <select id="sel-pais" className="campo" value="AR" onChange={() => {}}>
              <option value="AR">Argentina</option>
            </select>
          </div>
          <div>
            <label className="rotulo-campo" htmlFor="sel-provincia">Provincia</label>
            <select
              id="sel-provincia"
              className="campo"
              value={provinciaId}
              onChange={(evento) => elegirProvincia(evento.target.value)}
            >
              <option value="">Elegí la provincia…</option>
              {provincias.map((provincia) => (
                <option key={provincia.id} value={provincia.id}>{provincia.nombre}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="rotulo-campo" htmlFor="sel-ciudad">Ciudad</label>
            <select
              id="sel-ciudad"
              className="campo"
              value={elegida?.id ?? ''}
              disabled={ciudades.length === 0}
              onChange={(evento) => {
                const ciudad = ciudades.find((c) => c.id === evento.target.value);
                if (ciudad) elegir(ciudad);
              }}
            >
              <option value="">
                {provinciaId ? 'Elegí la ciudad…' : 'Primero la provincia'}
              </option>
              {ciudades.map((ciudad) => (
                <option key={ciudad.id} value={ciudad.id}>{ciudad.ciudad}</option>
              ))}
            </select>
          </div>
        </div>
      ) : (
        <button type="button" className="mt-2 text-xs font-semibold text-azul-txt" onClick={abrirCascada}>
          O elegí país, provincia y ciudad paso a paso
        </button>
      )}
    </div>
  );
}
