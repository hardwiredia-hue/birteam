'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

/** Poner, cambiar o sacar el PIN de staging (solo se muestra en staging). */
export function PinStaging({ activo }: { activo: boolean }) {
  const router = useRouter();
  const [pin, setPin] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState<{ texto: string; error?: boolean } | null>(null);

  async function guardar(evento: React.FormEvent) {
    evento.preventDefault();
    setEnviando(true);
    setMensaje(null);
    const respuesta = await fetch('/api/admin/pin-staging', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin }),
    });
    const datos = await respuesta.json().catch(() => ({}));
    setEnviando(false);
    if (!respuesta.ok) {
      setMensaje({ texto: datos.error ?? 'No se pudo guardar.', error: true });
      return;
    }
    setPin('');
    setMensaje({ texto: 'Listo: staging pide el PIN. Vos ya quedaste adentro.' });
    router.refresh();
  }

  async function sacar() {
    if (!window.confirm('¿Sacar el PIN? Staging queda abierto (igual no aparece en buscadores).')) return;
    setEnviando(true);
    await fetch('/api/admin/pin-staging', { method: 'DELETE' });
    setEnviando(false);
    setMensaje({ texto: 'PIN sacado: staging queda abierto.' });
    router.refresh();
  }

  return (
    <section className="tarjeta flex flex-col gap-3 p-4">
      <div>
        <p className="text-sm font-semibold">PIN de staging</p>
        <p className="text-xs text-tinta-3">
          {activo
            ? 'Activo: nadie ve el sitio de pruebas sin el PIN. Al cambiarlo, todos tienen que ponerlo de nuevo.'
            : 'Sin PIN: cualquiera con el link entra al sitio de pruebas. Poné uno de 4 a 8 números.'}{' '}
          Staging nunca aparece en buscadores.
        </p>
      </div>
      <form onSubmit={guardar} className="flex gap-2">
        <input
          className="campo flex-1 tabular"
          value={pin}
          onChange={(evento) => setPin(evento.target.value.replace(/\D/g, '').slice(0, 8))}
          inputMode="numeric"
          autoComplete="new-password"
          placeholder={activo ? 'PIN nuevo' : 'PIN (4 a 8 números)'}
          aria-label="PIN de staging"
        />
        <button type="submit" className="btn btn-secundario btn-sm" disabled={enviando || pin.length < 4}>
          {activo ? 'Cambiar' : 'Poner PIN'}
        </button>
      </form>
      {activo ? (
        <button type="button" className="self-start text-xs font-semibold text-tinta-3" onClick={sacar} disabled={enviando}>
          Sacar el PIN
        </button>
      ) : null}
      {mensaje ? <p className={mensaje.error ? 'aviso-error' : 'aviso-ok'}>{mensaje.texto}</p> : null}
    </section>
  );
}
