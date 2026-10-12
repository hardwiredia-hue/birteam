'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { LogoEquipo } from './logo-equipo';

/** Subir, cambiar o sacar el logo de un grupo o equipo. */
export function SubirLogo({
  endpoint,
  nombre,
  url,
  tam = 64,
}: {
  /** Ruta de la API que guarda el logo (PUT { logo }). */
  endpoint: string;
  nombre: string;
  url: string | null;
  tam?: number;
}) {
  const router = useRouter();
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function guardar(logo: string | null) {
    const respuesta = await fetch(endpoint, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ logo }),
    });
    const datos = await respuesta.json().catch(() => ({}));
    if (!respuesta.ok) throw new Error(datos.error ?? 'No se pudo guardar el logo.');
  }

  async function elegir(evento: React.ChangeEvent<HTMLInputElement>) {
    const archivo = evento.target.files?.[0];
    evento.target.value = '';
    if (!archivo) return;
    setSubiendo(true);
    setError(null);
    try {
      const form = new FormData();
      form.append('archivo', archivo);
      const respuesta = await fetch('/api/archivos', { method: 'POST', body: form });
      const datos = await respuesta.json().catch(() => ({}));
      if (!respuesta.ok) throw new Error(datos.error ?? 'No pudimos subir la imagen.');
      await guardar(datos.nombre);
      router.refresh();
    } catch (problema) {
      setError((problema as Error).message);
    }
    setSubiendo(false);
  }

  async function sacar() {
    setSubiendo(true);
    setError(null);
    try {
      await guardar(null);
      router.refresh();
    } catch (problema) {
      setError((problema as Error).message);
    }
    setSubiendo(false);
  }

  return (
    <div className="flex items-center gap-3">
      <LogoEquipo nombre={nombre} url={url} tam={tam} />
      <div className="flex flex-col items-start gap-1">
        <label className="btn btn-secundario btn-sm cursor-pointer">
          {subiendo ? 'Subiendo…' : url ? 'Cambiar logo' : 'Subir logo'}
          <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={elegir} disabled={subiendo} />
        </label>
        {url && !subiendo ? (
          <button type="button" onClick={sacar} className="text-xs font-semibold text-tinta-3 hover:text-tinta">
            Sacar logo
          </button>
        ) : null}
        {error ? <p className="text-xs text-rojo">{error}</p> : null}
      </div>
    </div>
  );
}
