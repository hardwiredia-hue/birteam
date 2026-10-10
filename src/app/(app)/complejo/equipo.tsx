'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface Miembro {
  id: string;
  nombre: string;
  usuario: string;
}

/** Empleados del complejo: gestionan turnos, no precios, Radar ni cobros. */
export function EquipoComplejo({ equipo }: { equipo: Miembro[] }) {
  const router = useRouter();
  const [usuario, setUsuario] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sumar(evento: React.FormEvent) {
    evento.preventDefault();
    setEnviando(true);
    setError(null);
    const respuesta = await fetch('/api/complejo/empleados', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usuario }),
    });
    const datos = await respuesta.json().catch(() => ({}));
    setEnviando(false);
    if (!respuesta.ok) {
      setError(datos.error ?? 'No se pudo sumar.');
      return;
    }
    setUsuario('');
    router.refresh();
  }

  async function sacar(id: string, nombre: string) {
    if (!window.confirm(`¿Sacar a ${nombre} del equipo?`)) return;
    await fetch('/api/complejo/empleados', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    router.refresh();
  }

  return (
    <section className="tarjeta flex flex-col gap-3 p-4">
      <div>
        <p className="text-sm font-semibold">Equipo del complejo</p>
        <p className="text-xs text-tinta-3">
          Ven y gestionan los turnos (bloquear, confirmar, rechazar, cancelar) y reciben los
          avisos de pedidos. No pueden cambiar precios, publicar en el Radar, tocar los cobros ni
          editar las canchas.
        </p>
      </div>
      {equipo.length > 0 ? (
        <div className="flex flex-col">
          {equipo.map((miembro) => (
            <div key={miembro.id} className="flex items-center justify-between border-b border-borde py-2 text-sm last:border-b-0">
              <span>
                {miembro.nombre} <span className="text-tinta-3">@{miembro.usuario}</span>
              </span>
              <button type="button" className="text-xs font-semibold text-tinta-3" onClick={() => sacar(miembro.id, miembro.nombre)}>
                Sacar
              </button>
            </div>
          ))}
        </div>
      ) : null}
      <form onSubmit={sumar} className="flex gap-2">
        <input
          className="campo flex-1"
          value={usuario}
          onChange={(evento) => setUsuario(evento.target.value)}
          placeholder="@usuario de quien atiende"
          autoComplete="off"
        />
        <button type="submit" className="btn btn-secundario btn-sm" disabled={enviando || !usuario.trim()}>
          Sumar
        </button>
      </form>
      {error ? <p className="aviso-error">{error}</p> : null}
    </section>
  );
}
