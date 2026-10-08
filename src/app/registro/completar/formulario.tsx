'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { SelectorCiudad } from '@/components/selector-ciudad';

interface Deporte {
  id: string;
  nombre: string;
}

/** Completa el registro que arrancó con Google: @usuario y datos del sistema. */
export function FormularioCompletar({
  token,
  nombreInicial,
  deportes,
}: {
  token: string;
  nombreInicial: string;
  deportes: Deporte[];
}) {
  const router = useRouter();
  const [elegidos, setElegidos] = useState<string[]>([]);
  const [tipoCuenta, setTipoCuenta] = useState('JUGADOR');
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
    const numero = (crudo: FormDataEntryValue | null) => {
      const valor = String(crudo ?? '').trim();
      const parseado = Number(valor);
      return valor && Number.isFinite(parseado) ? parseado : null;
    };
    const respuesta = await fetch('/api/auth/google/completar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token,
        nombre: form.get('nombre'),
        usuario: String(form.get('usuario') ?? '').toLowerCase(),
        deporteIds: elegidos,
        ciudad: form.get('ciudad') || null,
        provincia: form.get('provincia') || null,
        pais: form.get('pais') || 'AR',
        latitud: numero(form.get('latitud')),
        longitud: numero(form.get('longitud')),
        aceptaTerminos: form.get('aceptaTerminos') === 'on',
        tipoCuenta,
        complejoNombre: form.get('complejoNombre') || null,
        complejoDireccion: form.get('complejoDireccion') || null,
        telefono: form.get('telefono') || null,
        cuit: form.get('cuit') || null,
      }),
    });

    if (!respuesta.ok) {
      const datos = await respuesta.json().catch(() => ({}));
      setError(datos.error ?? 'No pudimos crear la cuenta. Probá de nuevo.');
      if (datos.detalles) setErrores(datos.detalles);
      setEnviando(false);
      return;
    }

    router.push(tipoCuenta === 'CANCHA' ? '/canchas/nueva' : '/panel');
    router.refresh();
  }

  return (
    <form onSubmit={alEnviar} className="mt-8 flex flex-col gap-4">
      <div>
        <span className="rotulo-campo">Tu cuenta es para</span>
        <div className="mt-1 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setTipoCuenta('JUGADOR')}
            className={tipoCuenta === 'JUGADOR' ? 'chip-sel chip-sel-activo' : 'chip-sel'}
          >
            Jugar
          </button>
          <button
            type="button"
            onClick={() => setTipoCuenta('CANCHA')}
            className={tipoCuenta === 'CANCHA' ? 'chip-sel chip-sel-activo' : 'chip-sel'}
          >
            Alquilar mi cancha
          </button>
        </div>
      </div>

      <div>
        <label className="rotulo-campo" htmlFor="usuario">
          Nombre de usuario
        </label>
        <div className="flex items-center gap-1.5">
          <span className="t-display text-[18px] text-verde-txt">@</span>
          <input
            id="usuario"
            name="usuario"
            className="campo"
            placeholder="tuusuario"
            pattern="[A-Za-z0-9._]+"
            autoComplete="username"
            required
          />
        </div>
        <ErrorDeCampo mensajes={errores.usuario} />
      </div>

      <div>
        <label className="rotulo-campo" htmlFor="nombre">
          {tipoCuenta === 'CANCHA' ? 'Nombre y apellido del titular' : 'Nombre y apellido'}
        </label>
        <input
          id="nombre"
          name="nombre"
          className="campo"
          defaultValue={nombreInicial}
          autoComplete="name"
          required
        />
        <ErrorDeCampo mensajes={errores.nombre} />
      </div>

      {tipoCuenta === 'CANCHA' ? (
        <>
          <div>
            <label className="rotulo-campo" htmlFor="complejoNombre">Nombre del complejo o la cancha</label>
            <input id="complejoNombre" name="complejoNombre" className="campo" placeholder="Complejo El Potrero" maxLength={80} required />
            <ErrorDeCampo mensajes={errores.complejoNombre} />
          </div>
          <div>
            <label className="rotulo-campo" htmlFor="complejoDireccion">Dirección del complejo</label>
            <input id="complejoDireccion" name="complejoDireccion" className="campo" placeholder="Av. Siempreviva 742" maxLength={160} required />
            <ErrorDeCampo mensajes={errores.complejoDireccion} />
          </div>
          <div>
            <label className="rotulo-campo" htmlFor="telefono">Teléfono de contacto</label>
            <input id="telefono" name="telefono" className="campo" placeholder="+54 9 11 5555-1234" maxLength={30} required />
            <ErrorDeCampo mensajes={errores.telefono} />
          </div>
          <div>
            <label className="rotulo-campo" htmlFor="cuit">CUIT o CUIL del titular</label>
            <input id="cuit" name="cuit" className="campo tabular" placeholder="20-12345678-3" inputMode="numeric" maxLength={15} required />
            <ErrorDeCampo mensajes={errores.cuit} />
          </div>
        </>
      ) : null}

      <div>
        <span className="rotulo-campo">
          {tipoCuenta === 'CANCHA'
            ? 'Qué canchas alquilás · los deportes de tu complejo'
            : 'Tus deportes · hasta 5, el 1º es el principal'}
        </span>
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

      <div>
        <label className="rotulo-campo" htmlFor="ciudad">
          {tipoCuenta === 'CANCHA' ? 'Ciudad del complejo' : 'Dónde jugás'}
        </label>
        <SelectorCiudad />
      </div>

      <label className="flex items-start gap-2.5 text-sm text-tinta-2">
        <input type="checkbox" name="aceptaTerminos" required className="mt-1 accent-[#a8e617]" />
        <span>
          Acepto los{' '}
          <a href="/terminos" target="_blank" className="font-semibold text-verde-txt">términos de uso</a>{' '}
          y la{' '}
          <a href="/privacidad" target="_blank" className="font-semibold text-verde-txt">política de privacidad</a>{' '}
          de birteam.
        </span>
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
