'use client';

import { useEffect, useState } from 'react';

/** La clave VAPID viaja en base64 URL-safe; el navegador la quiere en bytes. */
function claveABytes(clave: string) {
  const relleno = '='.repeat((4 - (clave.length % 4)) % 4);
  const base64 = (clave + relleno).replace(/-/g, '+').replace(/_/g, '/');
  const crudo = atob(base64);
  return Uint8Array.from(crudo, (c) => c.charCodeAt(0));
}

/**
 * Interruptor "Avisos en este dispositivo": suscribe el navegador a las
 * notificaciones push. Solo aparece si el navegador lo soporta y el ambiente
 * tiene clave VAPID configurada.
 */
export function ActivarPush() {
  const [clave, setClave] = useState<string | null>(null);
  const [activo, setActivo] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [bloqueado, setBloqueado] = useState(false);

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    let vigente = true;
    (async () => {
      try {
        const respuesta = await fetch('/api/push/clave');
        const datos = await respuesta.json();
        if (!vigente || !datos.clave) return;
        setClave(datos.clave);
        setBloqueado(Notification.permission === 'denied');
        const registro = await navigator.serviceWorker.ready;
        const suscripcion = await registro.pushManager.getSubscription();
        if (vigente) setActivo(Boolean(suscripcion));
      } catch {
        // Sin soporte o sin red: el interruptor simplemente no aparece.
      }
    })();
    return () => {
      vigente = false;
    };
  }, []);

  async function alternar() {
    if (!clave || ocupado) return;
    setOcupado(true);
    try {
      const registro = await navigator.serviceWorker.ready;
      if (activo) {
        const suscripcion = await registro.pushManager.getSubscription();
        if (suscripcion) {
          await fetch('/api/push', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ endpoint: suscripcion.endpoint }),
          });
          await suscripcion.unsubscribe();
        }
        setActivo(false);
      } else {
        const permiso = await Notification.requestPermission();
        if (permiso !== 'granted') {
          setBloqueado(permiso === 'denied');
          return;
        }
        const suscripcion = await registro.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: claveABytes(clave),
        });
        const respuesta = await fetch('/api/push', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(suscripcion.toJSON()),
        });
        if (respuesta.ok) {
          setActivo(true);
        } else {
          await suscripcion.unsubscribe();
        }
      }
    } catch {
      // Si el navegador falla al suscribir, el interruptor queda como estaba.
    } finally {
      setOcupado(false);
    }
  }

  if (!clave) return null;

  return (
    <div className="tarjeta flex items-center justify-between p-4">
      <div>
        <p className="text-sm font-semibold">Avisos en este dispositivo</p>
        <p className="text-xs text-tinta-3">
          {bloqueado
            ? 'Los bloqueaste en el navegador: activalos desde la configuración del sitio.'
            : 'Lugar liberado, recordatorios y mensajes, aunque la app esté cerrada.'}
        </p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={activo}
        onClick={alternar}
        disabled={ocupado || bloqueado}
        className="relative h-[22px] w-10 shrink-0 rounded-[6px] border-0 transition-colors"
        style={{ background: activo ? 'var(--verde)' : 'var(--borde-2)' }}
      >
        <span
          className="absolute top-[2px] h-[18px] w-[18px] rounded-[4px] transition-all"
          style={{
            left: activo ? 20 : 2,
            background: activo ? 'var(--sobre-verde)' : 'var(--tinta-2)',
          }}
        />
      </button>
    </div>
  );
}
