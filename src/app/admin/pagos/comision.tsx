'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function EditarComision({ inicial }: { inicial: number }) {
  const router = useRouter();
  const [valor, setValor] = useState(String(inicial));
  const [estado, setEstado] = useState<string | null>(null);

  async function guardar() {
    setEstado(null);
    const respuesta = await fetch('/api/admin/comision', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ porcentaje: Number(valor) }),
    });
    const datos = await respuesta.json().catch(() => ({}));
    setEstado(respuesta.ok ? `Guardado: ${datos.porcentaje}%` : (datos.error ?? 'No se pudo guardar.'));
    router.refresh();
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        type="number"
        min={0}
        max={30}
        step={0.5}
        value={valor}
        onChange={(evento) => setValor(evento.target.value)}
        className="campo w-24 tabular"
        aria-label="Comisión en porcentaje"
      />
      <span className="text-sm">%</span>
      <button type="button" className="btn btn-primario btn-sm" onClick={guardar}>
        Guardar
      </button>
      {estado ? <span className="text-xs text-tinta-3">{estado}</span> : null}
    </div>
  );
}
