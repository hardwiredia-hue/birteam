'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function BotonRol({ usuarioId, esAdmin }: { usuarioId: string; esAdmin: boolean }) {
  const router = useRouter();
  const [enviando, setEnviando] = useState(false);

  async function cambiar() {
    setEnviando(true);
    await fetch('/api/admin/usuarios', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usuarioId, rol: esAdmin ? 'USUARIO' : 'ADMIN' }),
    });
    setEnviando(false);
    router.refresh();
  }

  return (
    <button type="button" className="btn btn-secundario btn-sm" onClick={cambiar} disabled={enviando}>
      {enviando ? '…' : esAdmin ? 'Quitar admin' : 'Hacer admin'}
    </button>
  );
}

/** Verificación de titularidad: la decide administración mirando el comprobante. */
export function BotonVerificacion({ usuarioId, estado }: { usuarioId: string; estado: string }) {
  const router = useRouter();
  const [enviando, setEnviando] = useState(false);

  async function cambiar(verificacion: 'VERIFICADA' | 'RECHAZADA') {
    setEnviando(true);
    await fetch('/api/admin/usuarios', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usuarioId, verificacion }),
    });
    setEnviando(false);
    router.refresh();
  }

  if (estado === 'VERIFICADA') {
    return <span className="t-rotulo text-verde-txt">verificada ✓</span>;
  }

  return (
    <div className="flex gap-1.5">
      <button
        type="button"
        className="btn btn-secundario btn-sm"
        onClick={() => cambiar('VERIFICADA')}
        disabled={enviando}
      >
        {enviando ? '…' : 'Verificar'}
      </button>
      {estado !== 'RECHAZADA' ? (
        <button
          type="button"
          className="btn btn-peligro btn-sm"
          onClick={() => cambiar('RECHAZADA')}
          disabled={enviando}
        >
          Rechazar
        </button>
      ) : null}
    </div>
  );
}

/** Suscripción de dueño de cancha: +30 días o corte inmediato. */
export function BotonSuscripcion({ usuarioId, activa }: { usuarioId: string; activa: boolean }) {
  const router = useRouter();
  const [enviando, setEnviando] = useState(false);

  async function cambiar(accion: 'activar' | 'cortar') {
    if (accion === 'cortar' && !confirm('¿Cortar la suscripción ya? Sus canchas dejan de verse.')) {
      return;
    }
    setEnviando(true);
    await fetch('/api/admin/usuarios', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usuarioId, suscripcion: accion }),
    });
    setEnviando(false);
    router.refresh();
  }

  return (
    <div className="flex gap-1.5">
      <button
        type="button"
        className="btn btn-secundario btn-sm"
        onClick={() => cambiar('activar')}
        disabled={enviando}
      >
        {enviando ? '…' : '+30 días'}
      </button>
      {activa ? (
        <button
          type="button"
          className="btn btn-peligro btn-sm"
          onClick={() => cambiar('cortar')}
          disabled={enviando}
        >
          Cortar
        </button>
      ) : null}
    </div>
  );
}
