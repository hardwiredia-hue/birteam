'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function CopiarInvitacion({ ruta }: { ruta: string }) {
  const [copiado, setCopiado] = useState(false);

  async function invitar() {
    const url = `${window.location.origin}${ruta}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Sumate a mi grupo en birteam', url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      // Canceló el share: nada que hacer.
    }
  }

  return (
    <button type="button" className="btn btn-secundario" onClick={invitar}>
      {copiado ? 'Link copiado ✓' : 'Invitar gente'}
    </button>
  );
}

/** Edición del grupo (nombre, descripción, abierto). Solo administradores. */
export function EditarGrupo({
  grupoId,
  inicial,
}: {
  grupoId: string;
  inicial: { nombre: string; descripcion: string | null; abierto: boolean };
}) {
  const router = useRouter();
  const [abiertoPanel, setAbiertoPanel] = useState(false);
  const [nombre, setNombre] = useState(inicial.nombre);
  const [descripcion, setDescripcion] = useState(inicial.descripcion ?? '');
  const [abierto, setAbierto] = useState(inicial.abierto);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function guardar() {
    setGuardando(true);
    setError(null);
    const respuesta = await fetch(`/api/grupos/${grupoId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre: nombre.trim(),
        descripcion: descripcion.trim() || null,
        abierto,
      }),
    });
    setGuardando(false);
    if (!respuesta.ok) {
      const datos = await respuesta.json().catch(() => ({}));
      setError(datos.error ?? 'No pudimos guardar los cambios.');
      return;
    }
    setAbiertoPanel(false);
    router.refresh();
  }

  if (!abiertoPanel) {
    return (
      <button type="button" className="btn btn-secundario" onClick={() => setAbiertoPanel(true)}>
        Editar el grupo
      </button>
    );
  }

  return (
    <div className="tarjeta flex flex-col gap-3 p-4">
      <p className="text-sm font-semibold">Editar el grupo</p>
      <div>
        <label className="rotulo-campo" htmlFor="grupo-nombre">Nombre</label>
        <input
          id="grupo-nombre"
          className="campo"
          maxLength={60}
          value={nombre}
          onChange={(evento) => setNombre(evento.target.value)}
        />
      </div>
      <div>
        <label className="rotulo-campo" htmlFor="grupo-descripcion">Descripción</label>
        <textarea
          id="grupo-descripcion"
          className="campo min-h-16 resize-y"
          maxLength={400}
          value={descripcion}
          onChange={(evento) => setDescripcion(evento.target.value)}
        />
      </div>
      <label className="flex items-center justify-between gap-3">
        <span className="text-sm">
          <span className="block font-semibold">Grupo abierto</span>
          <span className="block text-xs text-tinta-3">
            Aparece en Explorar con botón Sumarme. Cerrado: solo entran por link.
          </span>
        </span>
        <input
          type="checkbox"
          checked={abierto}
          onChange={(evento) => setAbierto(evento.target.checked)}
          className="h-5 w-5 accent-[#a8e617]"
        />
      </label>
      {error ? <p className="aviso-error">{error}</p> : null}
      <div className="flex gap-2">
        <button type="button" className="btn btn-fantasma btn-sm flex-1" onClick={() => setAbiertoPanel(false)}>
          Cancelar
        </button>
        <button
          type="button"
          className="btn btn-primario btn-sm flex-[2]"
          onClick={guardar}
          disabled={guardando || nombre.trim().length < 2}
        >
          {guardando ? 'Guardando…' : 'Guardar'}
        </button>
      </div>
    </div>
  );
}

/** Botones de gestión de un miembro (hacer/quitar admin, sacar). Solo admins. */
export function AccionesMiembro({
  grupoId,
  usuarioId,
  nombre,
  esAdmin,
}: {
  grupoId: string;
  usuarioId: string;
  nombre: string;
  esAdmin: boolean;
}) {
  const router = useRouter();
  const [ocupado, setOcupado] = useState(false);

  async function mandar(accion: 'hacer-admin' | 'quitar-admin' | 'sacar') {
    if (accion === 'sacar' && !confirm(`¿Sacar a ${nombre} del grupo?`)) return;
    setOcupado(true);
    const respuesta = await fetch(`/api/grupos/${grupoId}/miembros`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usuarioId, accion }),
    });
    setOcupado(false);
    if (!respuesta.ok) {
      const datos = await respuesta.json().catch(() => ({}));
      alert(datos.error ?? 'No pudimos hacer el cambio.');
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex gap-1.5">
      <button
        type="button"
        className="btn btn-secundario btn-sm"
        onClick={() => mandar(esAdmin ? 'quitar-admin' : 'hacer-admin')}
        disabled={ocupado}
      >
        {ocupado ? '…' : esAdmin ? 'Quitar admin' : 'Hacer admin'}
      </button>
      <button
        type="button"
        className="btn btn-peligro btn-sm"
        onClick={() => mandar('sacar')}
        disabled={ocupado}
      >
        Sacar
      </button>
    </div>
  );
}
