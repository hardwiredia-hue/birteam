'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface Deporte {
  id: string;
  nombre: string;
}

export function FormularioRegistro({ deportes }: { deportes: Deporte[] }) {
  const router = useRouter();
  const [elegidos, setElegidos] = useState<string[]>([]);
  const [errores, setErrores] = useState<Record<string, string[]>>({});
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  function alternarDeporte(id: string) {
    setElegidos((actuales) =>
      actuales.includes(id) ? actuales.filter((otro) => otro !== id) : [...actuales, id].slice(0, 5)
    );
  }

  async function alEnviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setEnviando(true);
    setError(null);
    setErrores({});

    const form = new FormData(evento.currentTarget);
    const respuesta = await fetch('/api/auth/registro', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre: form.get('nombre'),
        usuario: String(form.get('usuario') ?? '').toLowerCase(),
        email: form.get('email'),
        clave: form.get('clave'),
        deporteIds: elegidos,
        ciudad: form.get('ciudad') || null,
        provincia: form.get('provincia') || null,
        aceptaTerminos: form.get('aceptaTerminos') === 'on',
      }),
    });

    if (!respuesta.ok) {
      const datos = await respuesta.json().catch(() => ({}));
      setError(datos.error ?? 'No pudimos crear la cuenta. Probá de nuevo.');
      if (datos.detalles) setErrores(datos.detalles);
      setEnviando(false);
      return;
    }

    router.push('/panel');
    router.refresh();
  }

  return (
    <form onSubmit={alEnviar} className="mt-8 flex flex-col gap-4">
      <div>
        <label className="rotulo-campo" htmlFor="nombre">
          Nombre y apellido
        </label>
        <input id="nombre" name="nombre" className="campo" autoComplete="name" required />
        <ErrorDeCampo mensajes={errores.nombre} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="rotulo-campo" htmlFor="usuario">
            Usuario
          </label>
          <input
            id="usuario"
            name="usuario"
            className="campo"
            placeholder="tuusuario"
            pattern="[A-Za-z0-9._]+"
            autoComplete="username"
            required
          />
          <ErrorDeCampo mensajes={errores.usuario} />
        </div>
        <div>
          <label className="rotulo-campo" htmlFor="clave">
            Contraseña
          </label>
          <input
            id="clave"
            name="clave"
            type="password"
            className="campo"
            minLength={8}
            placeholder="Mínimo 8"
            autoComplete="new-password"
            required
          />
          <ErrorDeCampo mensajes={errores.clave} />
        </div>
      </div>

      <div>
        <label className="rotulo-campo" htmlFor="email">
          Email
        </label>
        <input id="email" name="email" type="email" className="campo" autoComplete="email" required />
        <ErrorDeCampo mensajes={errores.email} />
      </div>

      <div>
        <span className="rotulo-campo">Tus deportes · hasta 5, el 1º es el principal</span>
        <div className="mt-1 flex flex-wrap gap-2">
          {deportes.map((deporte) => {
            const activo = elegidos.includes(deporte.id);
            return (
              <button
                key={deporte.id}
                type="button"
                onClick={() => alternarDeporte(deporte.id)}
                className={activo ? 'chip-sel chip-sel-activo' : 'chip-sel'}
              >
                {activo && elegidos[0] === deporte.id ? '★ ' : ''}
                {deporte.nombre}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="rotulo-campo" htmlFor="ciudad">
            Ciudad
          </label>
          <input id="ciudad" name="ciudad" className="campo" placeholder="Córdoba" />
        </div>
        <div>
          <label className="rotulo-campo" htmlFor="provincia">
            Provincia
          </label>
          <input id="provincia" name="provincia" className="campo" placeholder="Córdoba" />
        </div>
      </div>

      <label className="flex items-start gap-2.5 text-sm text-tinta-2">
        <input type="checkbox" name="aceptaTerminos" required className="mt-1 accent-[#a8e617]" />
        <span>Acepto los términos de uso y la política de privacidad de birteam.</span>
      </label>
      <ErrorDeCampo mensajes={errores.aceptaTerminos} />

      {error ? <p className="aviso-error">{error}</p> : null}

      <button type="submit" className="btn btn-primario mt-2" disabled={enviando}>
        {enviando ? 'Creando tu cuenta…' : 'Crear mi cuenta'}
      </button>
    </form>
  );
}

function ErrorDeCampo({ mensajes }: { mensajes?: string[] }) {
  if (!mensajes?.length) return null;
  return <p className="mt-1 text-xs text-rojo">{mensajes[0]}</p>;
}
