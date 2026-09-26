'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { SelectorCiudad } from '@/components/selector-ciudad';

export function FormularioEditar({
  inicial,
}: {
  inicial: {
    nombre: string;
    bio: string | null;
    telefono: string | null;
    ciudad: string | null;
    provincia: string | null;
  };
}) {
  const router = useRouter();
  const [errores, setErrores] = useState<Record<string, string[]>>({});
  const [error, setError] = useState<string | null>(null);
  const [listo, setListo] = useState(false);
  const [enviando, setEnviando] = useState(false);

  async function alEnviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setEnviando(true);
    setError(null);
    setErrores({});
    setListo(false);

    const form = new FormData(evento.currentTarget);
    const numero = (crudo: FormDataEntryValue | null) => {
      const valor = String(crudo ?? '').trim();
      const parseado = Number(valor);
      return valor && Number.isFinite(parseado) ? parseado : null;
    };
    const respuesta = await fetch('/api/perfil', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre: form.get('nombre'),
        bio: form.get('bio') || null,
        telefono: form.get('telefono') || null,
        ciudad: form.get('ciudad') || null,
        provincia: form.get('provincia') || null,
        pais: form.get('pais') || 'AR',
        latitud: numero(form.get('latitud')),
        longitud: numero(form.get('longitud')),
      }),
    });
    setEnviando(false);
    const datos = await respuesta.json().catch(() => ({}));
    if (!respuesta.ok) {
      setError(datos.error ?? 'No pudimos guardar los cambios.');
      if (datos.detalles) setErrores(datos.detalles);
      return;
    }
    setListo(true);
    router.refresh();
  }

  return (
    <form onSubmit={alEnviar} className="flex flex-col gap-4">
      <div>
        <label className="rotulo-campo" htmlFor="nombre">Nombre y apellido</label>
        <input id="nombre" name="nombre" className="campo" defaultValue={inicial.nombre} required />
        {errores.nombre ? <p className="mt-1 text-xs text-rojo">{errores.nombre[0]}</p> : null}
      </div>

      <div>
        <label className="rotulo-campo" htmlFor="bio">Bio · opcional</label>
        <textarea
          id="bio"
          name="bio"
          className="campo min-h-20 resize-y"
          maxLength={300}
          defaultValue={inicial.bio ?? ''}
          placeholder="Contá quién sos y qué jugás."
        />
      </div>

      <div>
        <label className="rotulo-campo" htmlFor="telefono">Teléfono · opcional</label>
        <input
          id="telefono"
          name="telefono"
          className="campo"
          defaultValue={inicial.telefono ?? ''}
          placeholder="+54 9 …"
        />
      </div>

      <div>
        <label className="rotulo-campo" htmlFor="ciudad">Dónde jugás</label>
        <SelectorCiudad inicial={{ ciudad: inicial.ciudad, provincia: inicial.provincia }} />
      </div>

      {error ? <p className="aviso-error">{error}</p> : null}
      {listo ? <p className="aviso-ok">Perfil guardado.</p> : null}

      <button type="submit" className="btn btn-primario" disabled={enviando}>
        {enviando ? 'Guardando…' : 'Guardar cambios'}
      </button>
    </form>
  );
}
