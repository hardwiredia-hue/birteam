'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function AltaCiudad({ provincias }: { provincias: { id: string; nombre: string }[] }) {
  const router = useRouter();
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [listo, setListo] = useState<string | null>(null);

  async function alEnviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setEnviando(true);
    setError(null);
    setListo(null);
    const form = new FormData(evento.currentTarget);
    const respuesta = await fetch('/api/admin/ciudades', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre: form.get('nombre'),
        provinciaId: form.get('provinciaId'),
        latitud: form.get('latitud') ? Number(form.get('latitud')) : null,
        longitud: form.get('longitud') ? Number(form.get('longitud')) : null,
      }),
    });
    setEnviando(false);
    const datos = await respuesta.json().catch(() => ({}));
    if (!respuesta.ok) {
      setError(datos.error ?? 'No pudimos cargarla.');
      return;
    }
    setListo(`Cargada. Ya aparece en el autocompletado.`);
    (evento.target as HTMLFormElement).reset();
    router.refresh();
  }

  return (
    <form onSubmit={alEnviar} className="tarjeta flex flex-col gap-3 p-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="rotulo-campo" htmlFor="alta-nombre">Nombre</label>
          <input id="alta-nombre" name="nombre" className="campo" required />
        </div>
        <div>
          <label className="rotulo-campo" htmlFor="alta-provincia">Provincia</label>
          <select id="alta-provincia" name="provinciaId" className="campo" required defaultValue="">
            <option value="" disabled>Elegir…</option>
            {provincias.map((provincia) => (
              <option key={provincia.id} value={provincia.id}>{provincia.nombre}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="rotulo-campo" htmlFor="alta-lat">Latitud · opcional</label>
          <input id="alta-lat" name="latitud" type="number" step="any" className="campo tabular" placeholder="-38.0055" />
        </div>
        <div>
          <label className="rotulo-campo" htmlFor="alta-lng">Longitud · opcional</label>
          <input id="alta-lng" name="longitud" type="number" step="any" className="campo tabular" placeholder="-57.5426" />
        </div>
      </div>
      {error ? <p className="aviso-error">{error}</p> : null}
      {listo ? <p className="aviso-ok">{listo}</p> : null}
      <button type="submit" className="btn btn-primario btn-sm" disabled={enviando}>
        {enviando ? 'Cargando…' : 'Cargar ciudad'}
      </button>
    </form>
  );
}

export function BorrarCiudad({ ciudadId, nombre }: { ciudadId: string; nombre: string }) {
  const router = useRouter();
  const [confirmando, setConfirmando] = useState(false);
  const [enviando, setEnviando] = useState(false);

  async function borrar() {
    setEnviando(true);
    await fetch('/api/admin/ciudades', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ciudadId }),
    });
    setEnviando(false);
    setConfirmando(false);
    router.refresh();
  }

  if (!confirmando) {
    return (
      <button type="button" className="text-xs font-semibold" style={{ color: 'var(--rojo)' }} onClick={() => setConfirmando(true)}>
        Borrar
      </button>
    );
  }
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-tinta-3">¿Borrar {nombre}?</span>
      <button type="button" className="text-xs font-semibold text-tinta-3" onClick={() => setConfirmando(false)}>
        No
      </button>
      <button type="button" className="text-xs font-semibold" style={{ color: 'var(--rojo)' }} onClick={borrar} disabled={enviando}>
        {enviando ? '…' : 'Sí'}
      </button>
    </div>
  );
}
