'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function AccionesPerfil({ temaActual }: { temaActual: string }) {
  const router = useRouter();
  const [tema, setTema] = useState(temaActual);
  const [saliendo, setSaliendo] = useState(false);

  async function cambiarTema() {
    const nuevo = tema === 'claro' ? 'oscuro' : 'claro';
    setTema(nuevo);
    document.documentElement.dataset.theme = nuevo === 'claro' ? 'light' : '';
    if (nuevo === 'oscuro') delete document.documentElement.dataset.theme;
    await fetch('/api/tema', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tema: nuevo }),
    });
    router.refresh();
  }

  async function salir() {
    setSaliendo(true);
    await fetch('/api/auth/salir', { method: 'POST' });
    router.push('/');
    router.refresh();
  }

  return (
    <section className="flex flex-col gap-3">
      <p className="t-rotulo">Ajustes</p>

      <div className="tarjeta flex items-center justify-between p-4">
        <div>
          <p className="text-sm font-semibold">Tema claro</p>
          <p className="text-xs text-tinta-3">La app arranca en oscuro; esto lo cambia para vos.</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={tema === 'claro'}
          onClick={cambiarTema}
          className="relative h-[22px] w-10 rounded-[6px] border-0 transition-colors"
          style={{ background: tema === 'claro' ? 'var(--verde)' : 'var(--borde-2)' }}
        >
          <span
            className="absolute top-[2px] h-[18px] w-[18px] rounded-[4px] transition-all"
            style={{
              left: tema === 'claro' ? 20 : 2,
              background: tema === 'claro' ? 'var(--sobre-verde)' : 'var(--tinta-2)',
            }}
          />
        </button>
      </div>

      <button type="button" className="btn btn-peligro" onClick={salir} disabled={saliendo}>
        {saliendo ? 'Cerrando…' : 'Cerrar sesión'}
      </button>
    </section>
  );
}
