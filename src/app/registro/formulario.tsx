'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { SelectorCiudad } from '@/components/selector-ciudad';

interface Deporte {
  id: string;
  nombre: string;
}

export function FormularioRegistro({
  deportes,
  volver,
  puerta,
}: {
  deportes: Deporte[];
  volver?: string | null;
  puerta?: string;
}) {
  const router = useRouter();
  const [elegidos, setElegidos] = useState<string[]>([]);
  const [tipoCuenta, setTipoCuenta] = useState(puerta === 'cancha' ? 'CANCHA' : 'JUGADOR');
  const [logo, setLogo] = useState<File | null>(null);
  const [comprobante, setComprobante] = useState<File | null>(null);
  const [errores, setErrores] = useState<Record<string, string[]>>({});
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  /** Sube una imagen ya con sesión creada y devuelve el nombre de archivo. */
  async function subirImagen(archivo: File) {
    const form = new FormData();
    form.append('archivo', archivo);
    const respuesta = await fetch('/api/archivos', { method: 'POST', body: form });
    const datos = await respuesta.json().catch(() => ({}));
    return respuesta.ok ? (datos.nombre as string) : null;
  }

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
        pais: form.get('pais') || 'AR',
        latitud: numero(form.get('latitud')),
        longitud: numero(form.get('longitud')),
        aceptaTerminos: form.get('aceptaTerminos') === 'on',
        tipoCuenta,
        complejoNombre: form.get('complejoNombre') || null,
        complejoDireccion: form.get('complejoDireccion') || null,
        telefono: form.get('telefono') || null,
        cuit: form.get('cuit') || null,
        web: form.get('web'),
      }),
    });

    if (!respuesta.ok) {
      const datos = await respuesta.json().catch(() => ({}));
      setError(datos.error ?? 'No pudimos crear la cuenta. Probá de nuevo.');
      if (datos.detalles) setErrores(datos.detalles);
      setEnviando(false);
      return;
    }

    // Dueño de cancha: con la sesión ya creada, suben el logo y el comprobante.
    if (tipoCuenta === 'CANCHA' && (logo || comprobante)) {
      const nombreLogo = logo ? await subirImagen(logo) : null;
      const nombreComprobante = comprobante ? await subirImagen(comprobante) : null;
      await fetch('/api/perfil', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: form.get('nombre'),
          ...(nombreLogo ? { avatar: nombreLogo } : {}),
          ...(nombreComprobante ? { verificacionDoc: nombreComprobante } : {}),
        }),
      }).catch(() => {});
    }

    // Cada puerta lleva a su destino: armar el grupo, buscar juego o publicar la cancha.
    const destino =
      volver ??
      (tipoCuenta === 'CANCHA'
        ? '/canchas/nueva'
        : puerta === 'grupo'
          ? '/grupos/nuevo'
          : puerta === 'jugar'
            ? '/explorar'
            : '/panel');
    router.push(destino);
    router.refresh();
  }

  return (
    <form onSubmit={alEnviar} className="mt-8 flex flex-col gap-4">
      {/* Trampa anti-robots: invisible para personas, irresistible para scripts. */}
      <div aria-hidden="true" style={{ position: 'absolute', left: -9999, height: 0, overflow: 'hidden' }}>
        <label htmlFor="web">Tu sitio web</label>
        <input id="web" name="web" tabIndex={-1} autoComplete="off" />
      </div>

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
        {tipoCuenta === 'CANCHA' ? (
          <p className="mt-1.5 text-xs text-tinta-3">
            Publicás tu cancha para que los equipos la encuentren y la alquilen. Requiere
            suscripción y verificación de titularidad, que se completan después de crear la cuenta.
          </p>
        ) : null}
      </div>

      {tipoCuenta === 'CANCHA' ? (
        <>
          <div>
            <label className="rotulo-campo" htmlFor="complejoNombre">
              Nombre del complejo o la cancha
            </label>
            <input
              id="complejoNombre"
              name="complejoNombre"
              className="campo"
              placeholder="Complejo El Potrero"
              maxLength={80}
              required
            />
            <p className="mt-1 text-xs text-tinta-3">La referencia que van a ver los jugadores.</p>
            <ErrorDeCampo mensajes={errores.complejoNombre} />
          </div>
          <div>
            <label className="rotulo-campo" htmlFor="complejoDireccion">
              Dirección del complejo
            </label>
            <input
              id="complejoDireccion"
              name="complejoDireccion"
              className="campo"
              placeholder="Av. Siempreviva 742"
              maxLength={160}
              required
            />
            <ErrorDeCampo mensajes={errores.complejoDireccion} />
          </div>
          <div>
            <label className="rotulo-campo" htmlFor="telefono">
              Teléfono de contacto
            </label>
            <input
              id="telefono"
              name="telefono"
              className="campo"
              placeholder="+54 9 11 5555-1234"
              autoComplete="tel"
              maxLength={30}
              required
            />
            <p className="mt-1 text-xs text-tinta-3">Para las reservas y consultas de los jugadores.</p>
            <ErrorDeCampo mensajes={errores.telefono} />
          </div>
          <div>
            <label className="rotulo-campo" htmlFor="logo">
              Logo o foto del complejo · opcional
            </label>
            <input
              id="logo"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="campo"
              onChange={(evento) => setLogo(evento.target.files?.[0] ?? null)}
            />
          </div>
        </>
      ) : null}

      <div>
        <label className="rotulo-campo" htmlFor="nombre">
          {tipoCuenta === 'CANCHA' ? 'Nombre y apellido del titular' : 'Nombre y apellido'}
        </label>
        <input id="nombre" name="nombre" className="campo" autoComplete="name" required />
        <ErrorDeCampo mensajes={errores.nombre} />
      </div>

      {tipoCuenta === 'CANCHA' ? (
        <>
          <div>
            <label className="rotulo-campo" htmlFor="cuit">
              CUIT o CUIL del titular
            </label>
            <input
              id="cuit"
              name="cuit"
              className="campo tabular"
              placeholder="20-12345678-3"
              inputMode="numeric"
              maxLength={15}
              required
            />
            <ErrorDeCampo mensajes={errores.cuit} />
          </div>
          <div>
            <label className="rotulo-campo" htmlFor="comprobante">
              Comprobante de titularidad · recomendado
            </label>
            <input
              id="comprobante"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="campo"
              onChange={(evento) => setComprobante(evento.target.files?.[0] ?? null)}
            />
            <p className="mt-1 text-xs text-tinta-3">
              Foto de la constancia de AFIP/ARCA o de una factura de servicio del predio a nombre
              del titular. Lo revisamos nosotros y tu cancha sale con el sello Verificada. También
              podés subirlo después desde tu perfil.
            </p>
          </div>
        </>
      ) : null}

      <div className="grid grid-cols-2 gap-3">
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
          Dónde jugás
        </label>
        <SelectorCiudad />
      </div>

      <label className="flex items-start gap-2.5 text-sm text-tinta-2">
        <input type="checkbox" name="aceptaTerminos" required className="mt-1 accent-[#a8e617]" />
        <span>
          Acepto los{' '}
          <a href="/terminos" target="_blank" className="font-semibold text-verde-txt">
            términos de uso
          </a>{' '}
          y la{' '}
          <a href="/privacidad" target="_blank" className="font-semibold text-verde-txt">
            política de privacidad
          </a>{' '}
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
