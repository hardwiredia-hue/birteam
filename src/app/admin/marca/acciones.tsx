'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

/** Una imagen de marca: vista previa, subir reemplazo y restaurar la de fábrica. */
export function ImagenDeMarca({
  tipo,
  titulo,
  ayuda,
  url,
  personalizada,
  fondo,
  cuadrada = false,
}: {
  tipo: string;
  titulo: string;
  ayuda: string;
  url: string;
  personalizada: boolean;
  fondo: string;
  cuadrada?: boolean;
}) {
  const router = useRouter();
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function subir(evento: React.ChangeEvent<HTMLInputElement>) {
    const archivo = evento.target.files?.[0];
    evento.target.value = '';
    if (!archivo) return;
    setOcupado(true);
    setError(null);
    const form = new FormData();
    form.append('tipo', tipo);
    form.append('archivo', archivo);
    const respuesta = await fetch('/api/admin/marca', { method: 'POST', body: form });
    setOcupado(false);
    if (!respuesta.ok) {
      const datos = await respuesta.json().catch(() => ({}));
      setError(datos.error ?? 'No pudimos subir la imagen.');
      return;
    }
    router.refresh();
  }

  async function restaurar() {
    if (!confirm(`¿Volver al ${titulo.toLowerCase()} de fábrica?`)) return;
    setOcupado(true);
    setError(null);
    await fetch('/api/admin/marca', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tipo }),
    });
    setOcupado(false);
    router.refresh();
  }

  return (
    <div className="tarjeta flex flex-col gap-3 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">
            {titulo}
            {personalizada ? <span className="t-rotulo ml-2 text-verde-txt">propio</span> : null}
          </p>
          <p className="mt-0.5 text-xs text-tinta-3">{ayuda}</p>
        </div>
      </div>

      <div
        className="flex items-center justify-center rounded-[6px] border border-borde p-4"
        style={{ background: fondo }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt={titulo}
          style={cuadrada ? { width: 64, height: 64, objectFit: 'contain' } : { maxWidth: 160, height: 'auto' }}
        />
      </div>

      {error ? <p className="aviso-error">{error}</p> : null}

      <div className="flex gap-2">
        <label className="btn btn-secundario btn-sm cursor-pointer">
          {ocupado ? 'Un momento…' : 'Subir reemplazo'}
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            hidden
            onChange={subir}
            disabled={ocupado}
          />
        </label>
        {personalizada ? (
          <button
            type="button"
            className="btn btn-peligro btn-sm"
            onClick={restaurar}
            disabled={ocupado}
          >
            Restaurar
          </button>
        ) : null}
      </div>
    </div>
  );
}
