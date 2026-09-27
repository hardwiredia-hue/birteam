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
    avatarUrl: string | null;
    tipoCuenta: string;
  };
}) {
  const router = useRouter();
  const [tipoCuenta, setTipoCuenta] = useState(inicial.tipoCuenta);
  const [errores, setErrores] = useState<Record<string, string[]>>({});
  const [error, setError] = useState<string | null>(null);
  const [listo, setListo] = useState(false);
  const [enviando, setEnviando] = useState(false);
  // undefined = sin cambios · nombre de archivo = foto nueva · null = borrarla
  const [fotoNueva, setFotoNueva] = useState<string | null | undefined>(undefined);
  const [vistaPrevia, setVistaPrevia] = useState<string | null>(inicial.avatarUrl);
  const [subiendoFoto, setSubiendoFoto] = useState(false);

  async function elegirFoto(evento: React.ChangeEvent<HTMLInputElement>) {
    const archivo = evento.target.files?.[0];
    evento.target.value = '';
    if (!archivo) return;
    setSubiendoFoto(true);
    setError(null);
    const form = new FormData();
    form.append('archivo', archivo);
    const respuesta = await fetch('/api/archivos', { method: 'POST', body: form });
    const datos = await respuesta.json().catch(() => ({}));
    setSubiendoFoto(false);
    if (!respuesta.ok) {
      setError(datos.error ?? 'No pudimos subir la foto.');
      return;
    }
    setFotoNueva(datos.nombre);
    setVistaPrevia(datos.url);
  }

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
        ...(fotoNueva !== undefined ? { avatar: fotoNueva } : {}),
        bio: form.get('bio') || null,
        telefono: form.get('telefono') || null,
        ciudad: form.get('ciudad') || null,
        provincia: form.get('provincia') || null,
        pais: form.get('pais') || 'AR',
        latitud: numero(form.get('latitud')),
        longitud: numero(form.get('longitud')),
        tipoCuenta,
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
      <div className="flex items-center gap-4">
        {vistaPrevia ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={vistaPrevia} alt="" className="avatar h-[72px] w-[72px] object-cover" />
        ) : (
          <span className="avatar h-[72px] w-[72px] text-xl">
            {inicial.nombre.split(' ').map((parte) => parte[0]).slice(0, 2).join('').toUpperCase()}
          </span>
        )}
        <div className="flex flex-col gap-2">
          <label className="btn btn-secundario btn-sm cursor-pointer" htmlFor="foto-perfil">
            {subiendoFoto ? 'Subiendo…' : vistaPrevia ? 'Cambiar foto' : 'Subir foto'}
            <input
              id="foto-perfil"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              hidden
              onChange={elegirFoto}
              disabled={subiendoFoto}
            />
          </label>
          {vistaPrevia ? (
            <button
              type="button"
              className="text-xs font-semibold text-tinta-3"
              onClick={() => {
                setFotoNueva(null);
                setVistaPrevia(null);
              }}
            >
              Quitar foto
            </button>
          ) : null}
        </div>
      </div>

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
        {tipoCuenta === 'CANCHA' && inicial.tipoCuenta !== 'CANCHA' ? (
          <p className="mt-1.5 text-xs text-tinta-3">
            Publicar canchas requiere una suscripción, que se activa aparte.
          </p>
        ) : null}
      </div>

      {error ? <p className="aviso-error">{error}</p> : null}
      {listo ? <p className="aviso-ok">Perfil guardado.</p> : null}

      <button type="submit" className="btn btn-primario" disabled={enviando}>
        {enviando ? 'Guardando…' : 'Guardar cambios'}
      </button>
    </form>
  );
}
